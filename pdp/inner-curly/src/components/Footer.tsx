
import Link from 'next/link';
import { Facebook, Instagram, Twitter } from 'lucide-react';

const Footer = () => {
  return (
    <footer className="bg-gray-50 border-t border-gray-200">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* About */}
          <div className="col-span-1 md:col-span-2">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">About InnerCurly</h3>
            <p className="text-gray-600">
              InnerCurly는 건강한 라이프스타일을 위한 프리미엄 이너뷰티 제품을 제공합니다. 
              자연에서 얻은 최상의 원료로 당신의 일상을 더욱 빛나게 만들어보세요.
            </p>
          </div>

          {/* Links */}
          <div>
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Links</h3>
            <ul className="space-y-2">
              <li><Link href="/about" className="text-gray-600 hover:text-pink-500">About Us</Link></li>
              <li><Link href="/contact" className="text-gray-600 hover:text-pink-500">Contact</Link></li>
              <li><Link href="/terms" className="text-gray-600 hover:text-pink-500">Terms of Service</Link></li>
              <li><Link href="/privacy" className="text-gray-600 hover:text-pink-500">Privacy Policy</Link></li>
            </ul>
          </div>

          {/* Social */}
          <div>
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Follow Us</h3>
            <div className="flex space-x-4">
              <a href="#" className="text-gray-600 hover:text-pink-500"><Facebook size={24} /></a>
              <a href="#" className="text-gray-600 hover:text-pink-500"><Instagram size={24} /></a>
              <a href="#" className="text-gray-600 hover:text-pink-500"><Twitter size={24} /></a>
            </div>
          </div>
        </div>

        <div className="mt-8 border-t border-gray-200 pt-8 text-center text-gray-500">
          <p>&copy; {new Date().getFullYear()} InnerCurly. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
