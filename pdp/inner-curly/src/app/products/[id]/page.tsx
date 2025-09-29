
'use client';

import { useState } from 'react';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import CTAButton from '@/components/CTAButton';
import products from '@/data/products.json';
import reviews from '@/data/reviews.json';
import { Star } from 'lucide-react';

export default function ProductDetailPage({ params }: { params: { id: string } }) {
  const product = products.find((p) => p.id === parseInt(params.id));
  const productReviews = reviews.filter((r) => r.productId === parseInt(params.id));

  const [activeTab, setActiveTab] = useState('info');

  if (!product) {
    notFound();
  }

  const tabs = [
    { id: 'info', label: 'Info' },
    { id: 'nutrition', label: 'Nutrition' },
    { id: 'reviews', label: 'Reviews' },
    { id: 'faq', label: 'FAQ' },
  ];

  return (
    <div className="container mx-auto px-4 py-12">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
        {/* Product Image Gallery */}
        <div className="relative h-[500px]">
          <Image
            src={product.image}
            alt={product.name}
            layout="fill"
            objectFit="cover"
            className="rounded-lg shadow-lg"
          />
        </div>

        {/* Product Details */}
        <div>
          <h1 className="text-4xl font-bold mb-4">{product.name}</h1>
          <p className="text-gray-600 text-lg mb-6">{product.description}</p>
          <div className="text-3xl font-bold text-pink-500 mb-8">{product.price.toLocaleString()}원</div>
          
          <CTAButton className="w-full text-lg">구독하기</CTAButton>

          {/* Tabs */}
          <div className="mt-12">
            <div className="border-b border-gray-200">
              <nav className="-mb-px flex space-x-8" aria-label="Tabs">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`${
                      activeTab === tab.id
                        ? 'border-pink-500 text-pink-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
                  >
                    {tab.label}
                  </button>
                ))}
              </nav>
            </div>

            <div className="py-8">
              {activeTab === 'info' && (
                <div>
                  <h3 className="text-xl font-semibold mb-4">상품 정보</h3>
                  <p>신선한 재료로 만든 InnerCurly의 {product.name}입니다. 매일 아침 건강한 식사를 경험해보세요.</p>
                </div>
              )}
              {activeTab === 'nutrition' && (
                <div>
                  <h3 className="text-xl font-semibold mb-4">영양 정보</h3>
                  <p>칼로리: 250kcal, 탄수화물: 30g, 단백질: 15g, 지방: 8g (제품별 영양 정보는 상이할 수 있습니다.)</p>
                </div>
              )}
              {activeTab === 'reviews' && (
                <div>
                  <h3 className="text-xl font-semibold mb-4">고객 후기 ({productReviews.length})</h3>
                  <div className="space-y-6">
                    {productReviews.map((review) => (
                      <div key={review.id} className="border-b pb-4">
                        <div className="flex items-center mb-2">
                          <div className="flex text-yellow-400">
                            {[...Array(review.rating)].map((_, i) => <Star key={i} size={16} fill="currentColor" />)}
                            {[...Array(5 - review.rating)].map((_, i) => <Star key={i} size={16} />)}
                          </div>
                          <p className="ml-2 font-semibold">{review.author}</p>
                        </div>
                        <p className="text-gray-600">{review.comment}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {activeTab === 'faq' && (
                <div>
                  <h3 className="text-xl font-semibold mb-4">자주 묻는 질문</h3>
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-semibold">배송은 얼마나 걸리나요?</h4>
                      <p>주문 후 1-2일 내에 배송됩니다. (주말/공휴일 제외)</p>
                    </div>
                    <div>
                      <h4 className="font-semibold">구독 취소는 어떻게 하나요?</h4>
                      <p>마이페이지에서 언제든지 구독을 취소하거나 변경할 수 있습니다.</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Sticky bottom CTA for mobile */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white p-4 border-t shadow-up">
        <CTAButton className="w-full text-lg">구독하기</CTAButton>
      </div>
    </div>
  );
}
