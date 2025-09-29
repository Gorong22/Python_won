
import Image from 'next/image';
import Link from 'next/link';
import CTAButton from '@/components/CTAButton';
import Card from '@/components/Card';
import products from '@/data/products.json';
import reviews from '@/data/reviews.json';

export default function HomePage() {
  return (
    <div>
      {/* Hero Section */}
      <section className="relative h-[600px] flex items-center justify-center text-center bg-cover bg-center" style={{ backgroundImage: "url('/images/hero-bg.jpg')" }}>
        <div className="absolute inset-0 bg-black opacity-30"></div>
        <div className="relative z-10 text-white px-4">
          <h1 className="text-4xl md:text-6xl font-extrabold mb-4 leading-tight">
            프리미엄 이너뷰티 루틴,<br /> 이제 InnerCurly에서 시작하세요.
          </h1>
          <p className="text-lg md:text-xl mb-8">당신의 건강한 아름다움을 위한 첫 걸음</p>
          <CTAButton>
            <Link href="/trial">무료 트라이얼 신청하기</Link>
          </CTAButton>
        </div>
      </section>

      {/* Today’s Starter Pack */}
      <section className="py-20 bg-gray-50">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12">Today’s Starter Pack</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {products.map((product) => (
              <Card
                key={product.id}
                href={`/products/${product.id}`}
                imageSrc={product.image}
                title={product.name}
                description={product.description}
              >
                <div className="text-lg font-bold text-pink-500">{product.price.toLocaleString()}원</div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Weekly Report */}
      <section className="py-20">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold mb-4">나만의 루틴 리포트</h2>
          <p className="text-gray-600 mb-8">InnerCurly와 함께하는 건강한 습관, 리포트로 확인해보세요.</p>
          <div className="max-w-3xl mx-auto bg-white p-8 rounded-lg shadow-lg">
            {/* Placeholder for charts/cards */}
            <div className="grid grid-cols-2 gap-8">
              <div className="text-center">
                <h4 className="text-xl font-semibold mb-2">섭취율</h4>
                <div className="text-4xl font-bold text-green-500">85%</div>
              </div>
              <div className="text-center">
                <h4 className="text-xl font-semibold mb-2">미션 달성율</h4>
                <div className="text-4xl font-bold text-pink-500">92%</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Wellness Story Section */}
      <section className="py-20 bg-pink-50">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12">Wellness Story</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Placeholder for blog-style carousel */}
            <div className="bg-white rounded-lg shadow-md overflow-hidden">
              <div className="relative h-48">
                <Image src="/images/story-1.jpg" alt="Wellness Story 1" layout="fill" objectFit="cover" />
              </div>
              <div className="p-6">
                <h3 className="font-semibold text-lg mb-2">아침을 바꾸는 건강한 습관</h3>
                <p className="text-gray-600 text-sm">InnerCurly 샐러드로 시작하는 상쾌한 아침!</p>
              </div>
            </div>
            <div className="bg-white rounded-lg shadow-md overflow-hidden">
              <div className="relative h-48">
                <Image src="/images/story-2.jpg" alt="Wellness Story 2" layout="fill" objectFit="cover" />
              </div>
              <div className="p-6">
                <h3 className="font-semibold text-lg mb-2">운동 후 필수템, 단백질 쉐이크</h3>
                <p className="text-gray-600 text-sm">맛과 영양을 모두 잡은 식물성 단백질</p>
              </div>
            </div>
            <div className="bg-white rounded-lg shadow-md overflow-hidden">
              <div className="relative h-48">
                <Image src="/images/story-3.jpg" alt="Wellness Story 3" layout="fill" objectFit="cover" />
              </div>
              <div className="p-6">
                <h3 className="font-semibold text-lg mb-2">피부 속부터 채우는 이너뷰티</h3>
                <p className="text-gray-600 text-sm">저분자 콜라겐으로 매일 예뻐지세요.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Before & After / Community */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12">Real Customer Reviews</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {reviews.map((review) => (
              <div key={review.id} className="bg-white p-6 rounded-lg shadow-lg text-center">
                <div className="flex justify-center space-x-4 mb-4">
                  <div className="w-32 h-32 relative rounded-full overflow-hidden">
                    <Image src={review.beforeImage} alt="Before" layout="fill" objectFit="cover" />
                  </div>
                  <div className="w-32 h-32 relative rounded-full overflow-hidden">
                    <Image src={review.afterImage} alt="After" layout="fill" objectFit="cover" />
                  </div>
                </div>
                <p className="text-gray-600 mb-4">"{review.comment}"</p>
                <p className="font-semibold">- {review.author}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
