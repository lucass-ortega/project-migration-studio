type PageHeroProps = {
  eyebrow: string;
  title: string;
  description: string;
};

export function PageHero({ eyebrow, title, description }: PageHeroProps) {
  return (
    <section className="bg-navy text-primary-foreground">
      <div className="mx-auto max-w-7xl px-6 py-14 md:py-20">
        <p className="text-sm tracking-[0.25em]">{eyebrow}</p>
        <div className="mt-3 h-1 w-14 bg-accent" />
        <h1 className="mt-5 max-w-3xl text-4xl font-extrabold leading-tight md:text-5xl">{title}</h1>
        <p className="mt-4 max-w-2xl text-lg text-primary-foreground/85 md:text-xl">{description}</p>
      </div>
    </section>
  );
}
