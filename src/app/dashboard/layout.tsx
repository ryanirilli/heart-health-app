import { Header } from "@/components/Header";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const passwordResetRequired = cookieStore.get("password_reset_required")?.value === "true";

  if (passwordResetRequired) {
    redirect("/reset-password");
  }

  return (
    <>
      <Header />
      {children}
    </>
  );
}

