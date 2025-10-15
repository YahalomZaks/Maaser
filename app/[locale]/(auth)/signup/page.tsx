import { SignupForm } from "@/components/shared/SignupForm";

export default function SignUpPage() {
  return (
    <section className="content-page">
      <div className="flex min-h-[60vh] flex-col items-center justify-center p-6 md:p-10">
        <div className="w-full max-w-sm md:max-w-3xl">
          <SignupForm />
        </div>
      </div>
    </section>
  );
}
