import "./globals.css";

export const metadata = {
  title: "Gen-AI Lab Project",
  description: "Gen-AI Lab Project",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        {children}
      </body>
    </html>
  );
}
