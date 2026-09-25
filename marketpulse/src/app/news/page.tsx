import { redirect } from "next/navigation";
/** Noticias desactivadas: no forman parte del producto. */
export default function NewsPage() {
  redirect("/settings");
}
