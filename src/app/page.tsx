import { HeroSection } from '@/components/hero-section';
import { FeaturedProducts } from '@/components/featured-products';
import { CategoriesGrid } from '@/components/categories-grid';
import { Header } from '@/components/header';
import { Footer } from '@/components/footer';

export default function HomePage() {
  return (
    <>
      <Header />
      <main>
        <HeroSection />
        <CategoriesGrid />
        <FeaturedProducts />
      </main>
      <Footer />
    </>
  );
}
