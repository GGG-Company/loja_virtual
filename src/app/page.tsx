import { HeroSection } from '@/components/hero-section';
import { FeaturedProducts } from '@/components/featured-products';
import { CategoriesGrid } from '@/components/categories-grid';
import { CasaSection } from '@/components/casa-section';
import { Header } from '@/components/header';
import { Footer } from '@/components/footer';
import { RecentlyViewed } from '@/components/recently-viewed';

// Revalidar a homepage a cada 10 minutos — serve do cache estático sem tocar no banco
export const revalidate = 600;

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
