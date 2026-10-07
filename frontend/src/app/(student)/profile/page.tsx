"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { PenLine } from "lucide-react";
import { useProfile, qk } from "@/hooks/queries";
import { studentApi } from "@/lib/api";
import { ApiError } from "@/lib/api/client";
import { useAuthStore } from "@/stores/auth";
import { formatDate, initials } from "@/lib/utils";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader, CardTitle, DataList, Skeleton } from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";
import { Field, Input, Textarea } from "@/components/ui/field";

const schema = z.object({
  alamat: z.string().trim().max(500).optional().or(z.literal("")),
  nomor_telepon: z.string().trim().regex(/^(0\d{9,13})?$/, "Nomor telepon tidak valid."),
  email: z.string().trim().email("Email tidak valid.").or(z.literal("")),
});
type FormValues = z.infer<typeof schema>;

export default function ProfilePage() {
  const user = useAuthStore((s) => s.user);
  const qc = useQueryClient();
  const { data: p, isLoading } = useProfile();
  const [edit, setEdit] = useState(false);

  const form = useForm<FormValues>({ resolver: zodResolver(schema), values: p ? { alamat: p.alamat, nomor_telepon: p.nomor_telepon, email: p.email } : undefined });

  async function onSave(v: FormValues) {
    try {
      await studentApi.updateProfile(v);
      qc.invalidateQueries({ queryKey: qk.profile });
      toast.success("Data kontak diperbarui.");
      setEdit(false);
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Gagal menyimpan.");
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="Akun"
        title="Profil Mahasiswa"
        description="Data ini dipakai otomatis saat mengisi formulir pengajuan. Data akademik dikelola Bagian Akademik."
        actions={
          p && (
            <Button variant="secondary" onClick={() => setEdit(true)}>
              <PenLine className="size-4" /> Ubah Kontak
            </Button>
          )
        }
      />

      {isLoading || !p ? (
        <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
          <Skeleton className="h-64 rounded-lg" />
          <Skeleton className="h-96 rounded-lg" />
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
          <Card className="flex flex-col items-center gap-4 p-8 text-center">
            <span className="flex size-20 items-center justify-center rounded-full bg-brand-navy text-display-md font-semibold text-on-dark">
              {initials(p.nama)}
            </span>
            <div>
              <p className="text-tagline font-semibold text-ink">{p.nama}</p>
              <p className="mt-1 text-caption text-ink-muted-48">{p.nim}</p>
            </div>
            <p className="text-caption text-ink-muted-80">{p.program_studi}</p>
            <p className="text-fine text-ink-muted-48">{p.fakultas}</p>
          </Card>

          <div className="flex flex-col gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Identitas Akademik</CardTitle>
              </CardHeader>
              <CardBody>
                <DataList
                  items={[
                    { label: "Nama Lengkap", value: p.nama },
                    { label: "NIM", value: p.nim },
                    { label: "Program Studi", value: p.program_studi },
                    { label: "Fakultas", value: p.fakultas },
                    { label: "Tempat, Tanggal Lahir", value: `${p.tempat_lahir}, ${formatDate(p.tanggal_lahir)}` },
                  ]}
                />
              </CardBody>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Kontak</CardTitle>
              </CardHeader>
              <CardBody>
                <DataList
                  items={[
                    { label: "Alamat", value: p.alamat },
                    { label: "Nomor Telepon", value: p.nomor_telepon },
                    { label: "Email", value: p.email },
                    { label: "Email Login", value: user?.email },
                  ]}
                />
              </CardBody>
            </Card>
          </div>
        </div>
      )}

      <Dialog open={edit} onClose={() => setEdit(false)} title="Ubah Data Kontak">
        <form onSubmit={form.handleSubmit(onSave)} className="flex flex-col gap-5" noValidate>
          <Field label="Alamat" htmlFor="alamat" error={form.formState.errors.alamat?.message}>
            <Textarea id="alamat" {...form.register("alamat")} />
          </Field>
          <Field label="Nomor Telepon" htmlFor="telp" error={form.formState.errors.nomor_telepon?.message}>
            <Input id="telp" {...form.register("nomor_telepon")} />
          </Field>
          <Field label="Email" htmlFor="email" error={form.formState.errors.email?.message}>
            <Input id="email" type="email" {...form.register("email")} />
          </Field>
          <div className="mt-2 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <Button type="button" variant="ghost" onClick={() => setEdit(false)}>
              Batal
            </Button>
            <Button type="submit" loading={form.formState.isSubmitting}>
              Simpan
            </Button>
          </div>
        </form>
      </Dialog>
    </>
  );
}
