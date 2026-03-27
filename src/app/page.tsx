import { HeroSection } from '@/components/hero-section';
import { FeaturedProducts } from '@/components/featured-products';
import { CategoriesGrid } from '@/components/categories-grid';
import { CasaSection } from '@/components/casa-section';
import { Header } from '@/components/header';
import { Footer } from '@/components/footer';
import { RecentlyViewed } from '@/components/recently-viewed';

export default function HomePage() {
  return (
    <>
      <Header />
      <main>
        <HeroSection />
        <CategoriesGrid />
        <FeaturedProducts />
        <RecentlyViewed />
        <CasaSection />
      </main>
      <Footer />
    </>
  );
}
