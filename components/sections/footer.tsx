import Link from "next/link"

export function Footer() {
  return (
    <footer className="bg-[#f0f2f7] flex flex-col gap-2 sm:flex-row py-6 w-full shrink-0 items-center px-4 md:px-6 border-t border-gray-100">
      <p className="text-xs text-gray-500">© 2024 NEXD.PM. All rights reserved.</p>
      <nav className="sm:ml-auto flex gap-4 sm:gap-6">
        <Link href="#" className="text-xs hover:underline underline-offset-4 text-gray-600">
          <strong>Privacy Policy</strong>
        </Link>
        <Link href="#" className="text-xs hover:underline underline-offset-4 text-gray-600">
          <strong>Terms of Service</strong>
        </Link>
        <Link href="#" className="text-xs hover:underline underline-offset-4 text-gray-600">
           <strong>Contact</strong>
        </Link>
        <Link href="#" className="text-xs hover:underline underline-offset-4 text-gray-600">
          <strong>Updates</strong>
        </Link>
      </nav>
    </footer>
  )
}
