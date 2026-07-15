import { MySamparkRegister } from "@/frontend/components/auth/MySamparkRegister";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Create Account · QuickReply",
  description: "Turn every comment and DM into a customer — automatically with QuickReply.",
};

export default function RegisterPage() {
  return <MySamparkRegister />;
}
