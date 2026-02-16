import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import Link from "next/link";
import { redirect } from "next/navigation";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "TresMigo CRM",
  description: "Modern Customer Relationship Management System",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);

  return (
    <html lang="en">
      <body className={inter.className}>
        <Providers>
          {session ? (
            <div className="min-h-screen bg-gray-50">
              <nav className="bg-white shadow-sm border-b">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                  <div className="flex justify-between h-16">
                    <div className="flex">
                      <div className="flex-shrink-0 flex items-center">
                        <Link href="/dashboard" className="text-xl font-bold text-gray-900">
                          TresMigo CRM
                        </Link>
                      </div>
                      <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
                        <Link
                          href="/dashboard"
                          className="inline-flex items-center px-1 pt-1 text-sm font-medium text-gray-900 hover:text-gray-700"
                        >
                          Dashboard
                        </Link>
                        <Link
                          href="/customers"
                          className="inline-flex items-center px-1 pt-1 text-sm font-medium text-gray-500 hover:text-gray-700"
                        >
                          Customers
                        </Link>
                        <Link
                          href="/leads"
                          className="inline-flex items-center px-1 pt-1 text-sm font-medium text-gray-500 hover:text-gray-700"
                        >
                          Leads
                        </Link>
                        <Link
                          href="/tasks"
                          className="inline-flex items-center px-1 pt-1 text-sm font-medium text-gray-500 hover:text-gray-700"
                        >
                          Tasks
                        </Link>
                        <div className="relative group">
                          <button className="inline-flex items-center px-1 pt-1 text-sm font-medium text-gray-500 hover:text-gray-700">
                            Settings
                            <svg className="ml-1 h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                            </svg>
                          </button>
                          <div className="absolute left-0 mt-2 w-48 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 bg-white border rounded-md shadow-lg z-50">
                            <Link href="/settings/organization" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                              Organization
                            </Link>
                            <Link href="/settings/team" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                              Team
                            </Link>
                            <Link href="/settings/departments" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                              Departments
                            </Link>
                            <Link href="/settings/roles" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                              Roles
                            </Link>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center">
                      <span className="text-sm text-gray-500 mr-4">
                        {session.user.name}
                      </span>
                      <form action="/api/auth/signout" method="POST">
                        <button
                          type="submit"
                          className="text-sm text-gray-500 hover:text-gray-700"
                        >
                          Sign out
                        </button>
                      </form>
                    </div>
                  </div>
                </div>
              </nav>
              <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
                {children}
              </main>
            </div>
          ) : (
            children
          )}
        </Providers>
      </body>
    </html>
  );
}
