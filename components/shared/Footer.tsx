import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";

const Footer = () => {
  const t = useTranslations("footer");
  const locale = useLocale();
  const year = new Date().getFullYear();

  return (
	<footer className="welcome-footer">
	  <div className="welcome-footer-container">
		<div className="welcome-footer-bottom" style={{ justifyContent: 'center', gap: '0.5rem', flexDirection: 'column' }}>
		  <div>&copy; {year} {t("appName", { default: "מערכת מעשרות" })}. {t("rights", { default: "כל הזכויות שמורות" })}.</div>
		  <div>
			<Link href={`/${locale}/terms`} className="welcome-footer-link">{t("terms")}</Link>
		  </div>
		</div>
	  </div>
	</footer>
  );
};

export default Footer;
