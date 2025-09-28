import Link from "next/link";

const Footer = () => {
	return (
		<footer className="welcome-footer">
			<div className="welcome-footer-container">
				<div className="welcome-footer-content">
					<div className="welcome-footer-section">
						<h3>המערכת</h3>
						<div className="welcome-footer-links">
							<Link href="#features" className="welcome-footer-link">איך זה עובד</Link>
							<Link href="#" className="welcome-footer-link">שאלות נפוצות</Link>
							<Link href="#" className="welcome-footer-link">מדריך למתחילים</Link>
							<Link href="#" className="welcome-footer-link">עדכונים חדשים</Link>
						</div>
					</div>
					
					<div className="welcome-footer-section">
						<h3>תמיכה</h3>
						<div className="welcome-footer-links">
							<Link href="#" className="welcome-footer-link">יצירת קשר</Link>
							<Link href="#" className="welcome-footer-link">דיווח על תקלה</Link>
							<Link href="#" className="welcome-footer-link">הצעות לשיפור</Link>
							<Link href="#" className="welcome-footer-link">מרכז עזרה</Link>
						</div>
					</div>
					
					<div className="welcome-footer-section">
						<h3>זיכוי הרבים</h3>
						<div className="welcome-footer-links">
							<Link href="#" className="welcome-footer-link">אודות הפרויקט</Link>
							<Link href="#" className="welcome-footer-link">למה זה חינם?</Link>
							<Link href="#" className="welcome-footer-link">איך אתם יכולים לעזור</Link>
							<Link href="#" className="welcome-footer-link">שתפו עם חברים</Link>
						</div>
					</div>
					
					<div className="welcome-footer-section">
						<h3>חוקי ופרטיות</h3>
						<div className="welcome-footer-links">
							<Link href="#" className="welcome-footer-link">תנאי שימוש</Link>
							<Link href="#" className="welcome-footer-link">מדיניות פרטיות</Link>
							<Link href="#" className="welcome-footer-link">אבטחת מידע</Link>
							<Link href="#" className="welcome-footer-link">עוגיות (Cookies)</Link>
						</div>
					</div>
				</div>
				
				<div className="welcome-footer-bottom">
					<div>&copy; 2025 מערכת מעשרות. כל הזכויות שמורות.</div>
					<div style={{ display: 'flex', gap: '1rem' }}>
						<span>פותח לזיכוי הרבים</span>
						<span>•</span>
						<span>בחינם לתמיד</span>
					</div>
				</div>
			</div>
		</footer>
	);
};

export default Footer;
