export default function Layout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<div className="dashboard-shell">
			<div className="dashboard-shell__inner">
				{children}
			</div>
		</div>
	);
}
