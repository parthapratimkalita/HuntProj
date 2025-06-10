import { Link } from "wouter";
import { 
  Facebook, Twitter, Instagram, Globe 
} from "lucide-react";

export default function Footer() {
  return (
    <footer className="border-t border-gray-200 bg-white mt-8">
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div>
            <h3 className="text-base font-semibold mb-4">Support</h3>
            <ul className="space-y-3 text-gray-600 text-sm">
              <li><Link href="#" className="hover:underline">Help Center</Link></li>
              <li><Link href="#" className="hover:underline">Safety information</Link></li>
              <li><Link href="#" className="hover:underline">Cancellation options</Link></li>
              <li><Link href="#" className="hover:underline">COVID-19 Response</Link></li>
            </ul>
          </div>
          <div>
            <h3 className="text-base font-semibold mb-4">Community</h3>
            <ul className="space-y-3 text-gray-600 text-sm">
              <li><Link href="#" className="hover:underline">Hunting guide</Link></li>
              <li><Link href="#" className="hover:underline">HuntStay Forum</Link></li>
              <li><Link href="#" className="hover:underline">Conservation efforts</Link></li>
              <li><Link href="#" className="hover:underline">Refer a friend</Link></li>
            </ul>
          </div>
          <div>
            <h3 className="text-base font-semibold mb-4">Hosting</h3>
            <ul className="space-y-3 text-gray-600 text-sm">
              <li><Link href="/provider/apply" className="hover:underline">List your property</Link></li>
              <li><Link href="#" className="hover:underline">Host resources</Link></li>
              <li><Link href="#" className="hover:underline">Community forum</Link></li>
              <li><Link href="#" className="hover:underline">Responsible hosting</Link></li>
            </ul>
          </div>
          <div>
            <h3 className="text-base font-semibold mb-4">About</h3>
            <ul className="space-y-3 text-gray-600 text-sm">
              <li><Link href="#" className="hover:underline">How HuntStay works</Link></li>
              <li><Link href="#" className="hover:underline">Newsroom</Link></li>
              <li><Link href="#" className="hover:underline">Careers</Link></li>
              <li><Link href="#" className="hover:underline">Privacy policy</Link></li>
            </ul>
          </div>
        </div>
        <div className="border-t border-gray-200 mt-8 pt-8 flex flex-col md:flex-row justify-between items-center">
          <div className="text-sm text-gray-600 mb-4 md:mb-0">
            &copy; {new Date().getFullYear()} HuntStay, Inc. &middot; <Link href="#" className="hover:underline">Privacy</Link> &middot; <Link href="#" className="hover:underline">Terms</Link> &middot; <Link href="#" className="hover:underline">Sitemap</Link>
          </div>
          <div className="flex items-center space-x-6">
            <div className="flex items-center text-gray-600">
              <Globe className="mr-2 h-4 w-4" />
              <span className="text-sm">English (US)</span>
            </div>
            <div className="flex items-center text-gray-600">
              <span className="text-sm font-medium">$ USD</span>
            </div>
            <div className="flex items-center space-x-4 text-gray-600">
              <Link href="#" className="hover:text-gray-900"><Facebook size={18} /></Link>
              <Link href="#" className="hover:text-gray-900"><Twitter size={18} /></Link>
              <Link href="#" className="hover:text-gray-900"><Instagram size={18} /></Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
