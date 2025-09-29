
import Image from 'next/image';
import Link from 'next/link';
import { ReactNode } from 'react';

interface CardProps {
  imageSrc: string;
  title: string;
  description: string;
  href: string;
  children?: ReactNode;
}

const Card = ({ imageSrc, title, description, href, children }: CardProps) => {
  return (
    <Link href={href} className="block group">
      <div className="bg-white rounded-lg shadow-md overflow-hidden transition-shadow duration-300 hover:shadow-xl">
        <div className="relative h-64">
          <Image
            src={imageSrc}
            alt={title}
            layout="fill"
            objectFit="cover"
            className="transition-transform duration-300 group-hover:scale-105"
          />
        </div>
        <div className="p-6">
          <h3 className="text-xl font-semibold text-gray-800 mb-2">{title}</h3>
          <p className="text-gray-600 mb-4">{description}</p>
          {children}
        </div>
      </div>
    </Link>
  );
};

export default Card;
