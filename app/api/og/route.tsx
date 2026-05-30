import { ImageResponse } from "next/og";

export const runtime = "nodejs";

export async function GET(request: Request) {
	const { searchParams } = new URL(request.url);
	const title = searchParams.get("title") ?? "oxom";
	const description =
		searchParams.get("description") ?? "Creator Workspace Platform";

	return new ImageResponse(
		<div
			style={{
				background: "#ffffff",
				width: "100%",
				height: "100%",
				display: "flex",
				flexDirection: "column",
				justifyContent: "space-between",
				padding: "80px",
				fontFamily: "sans-serif",
			}}
		>
			<div
				style={{
					display: "flex",
					fontSize: 22,
					color: "#999999",
					letterSpacing: "-0.01em",
				}}
			>
				oxom.de
			</div>

			<div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
				<div
					style={{
						fontSize: 72,
						fontWeight: 700,
						color: "#111111",
						lineHeight: 1.05,
						letterSpacing: "-0.04em",
					}}
				>
					{title}
				</div>
				<div
					style={{
						fontSize: 30,
						color: "#666666",
						lineHeight: 1.4,
						letterSpacing: "-0.01em",
					}}
				>
					{description}
				</div>
			</div>

			<div
				style={{
					display: "flex",
					alignItems: "center",
					gap: 12,
					fontSize: 20,
					color: "#111111",
					letterSpacing: "-0.02em",
				}}
			>
				<div
					style={{
						width: 32,
						height: 32,
						background: "#111111",
						borderRadius: "50%",
					}}
				/>
				oxom
			</div>
		</div>,
		{ width: 1200, height: 630 },
	);
}
