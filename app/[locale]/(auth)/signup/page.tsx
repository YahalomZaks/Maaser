import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";

import { SignupForm } from "@/components/shared/SignupForm";
import { getPageMetadata } from "@/lib/seo";

type PageProps = {
  params: { locale: string };
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  return getPageMetadata(params.locale, "signup");
}

export default function SignUpPage({ params }: PageProps) {
  setRequestLocale(params.locale);
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
