// Package websocket menyediakan hub koneksi realtime per user.
// Event dikirim sebagai JSON sesuai PRD §17.
package websocket

import (
	"encoding/json"
	"log"
	"net/http"
	"sync"
	"time"

	"github.com/google/uuid"
	gws "github.com/gorilla/websocket"
)

type Event struct {
	Event string      `json:"event"`
	Data  interface{} `json:"data"`
}

type StatusPayload struct {
	ApplicationID     uuid.UUID `json:"application_id"`
	ApplicationNumber string    `json:"application_number"`
	Status            string    `json:"status"`
	Message           string    `json:"message"`
}

type client struct {
	userID uuid.UUID
	role   string
	conn   *gws.Conn
	send   chan []byte
}

type Hub struct {
	mu       sync.RWMutex
	clients  map[*client]struct{}
	upgrader gws.Upgrader
}

func NewHub(allowedOrigins []string) *Hub {
	allowed := map[string]struct{}{}
	for _, o := range allowedOrigins {
		allowed[o] = struct{}{}
	}
	return &Hub{
		clients: map[*client]struct{}{},
		upgrader: gws.Upgrader{
			ReadBufferSize:  1024,
			WriteBufferSize: 4096,
			CheckOrigin: func(r *http.Request) bool {
				origin := r.Header.Get("Origin")
				if origin == "" {
					return true // non-browser client
				}
				_, ok := allowed[origin]
				return ok
			},
		},
	}
}

// Serve meng-upgrade koneksi HTTP dan mendaftarkan client.
func (h *Hub) Serve(w http.ResponseWriter, r *http.Request, userID uuid.UUID, role string) error {
	conn, err := h.upgrader.Upgrade(w, r, nil)
	if err != nil {
		return err
	}
	c := &client{userID: userID, role: role, conn: conn, send: make(chan []byte, 32)}

	h.mu.Lock()
	h.clients[c] = struct{}{}
	h.mu.Unlock()

	go c.writePump()
	go c.readPump(h)
	return nil
}

func (h *Hub) remove(c *client) {
	h.mu.Lock()
	if _, ok := h.clients[c]; ok {
		delete(h.clients, c)
		close(c.send)
	}
	h.mu.Unlock()
	_ = c.conn.Close()
}

// SendToUser mengirim event ke seluruh koneksi milik user tertentu.
func (h *Hub) SendToUser(userID uuid.UUID, ev Event) {
	h.broadcast(ev, func(c *client) bool { return c.userID == userID })
}

// SendToRole mengirim event ke seluruh user dengan role tertentu (mis. admin).
func (h *Hub) SendToRole(role string, ev Event) {
	h.broadcast(ev, func(c *client) bool { return c.role == role })
}

func (h *Hub) broadcast(ev Event, match func(*client) bool) {
	b, err := json.Marshal(ev)
	if err != nil {
		log.Printf("[ws] marshal: %v", err)
		return
	}
	h.mu.RLock()
	defer h.mu.RUnlock()
	for c := range h.clients {
		if !match(c) {
			continue
		}
		select {
		case c.send <- b:
		default:
			// buffer penuh: lewati, client lambat akan di-drop oleh writePump
		}
	}
}

func (h *Hub) Count() int {
	h.mu.RLock()
	defer h.mu.RUnlock()
	return len(h.clients)
}

const (
	writeWait  = 10 * time.Second
	pongWait   = 60 * time.Second
	pingPeriod = (pongWait * 9) / 10
)

func (c *client) readPump(h *Hub) {
	defer h.remove(c)
	c.conn.SetReadLimit(1024)
	_ = c.conn.SetReadDeadline(time.Now().Add(pongWait))
	c.conn.SetPongHandler(func(string) error {
		return c.conn.SetReadDeadline(time.Now().Add(pongWait))
	})
	for {
		// Client tidak diharapkan mengirim pesan; loop hanya untuk deteksi close.
		if _, _, err := c.conn.ReadMessage(); err != nil {
			return
		}
	}
}

func (c *client) writePump() {
	ticker := time.NewTicker(pingPeriod)
	defer func() {
		ticker.Stop()
		_ = c.conn.Close()
	}()
	for {
		select {
		case msg, ok := <-c.send:
			_ = c.conn.SetWriteDeadline(time.Now().Add(writeWait))
			if !ok {
				_ = c.conn.WriteMessage(gws.CloseMessage, []byte{})
				return
			}
			if err := c.conn.WriteMessage(gws.TextMessage, msg); err != nil {
				return
			}
		case <-ticker.C:
			_ = c.conn.SetWriteDeadline(time.Now().Add(writeWait))
			if err := c.conn.WriteMessage(gws.PingMessage, nil); err != nil {
				return
			}
		}
	}
}
