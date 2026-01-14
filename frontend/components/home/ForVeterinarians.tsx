import Link from 'next/link';

export const ForVeterinarians = () => {
  return (
    <section className="py-20 bg-slate-900 text-white rounded-t-[3rem] mt-10">
      <div className="container mx-auto px-4 text-center">
        <h2 className="text-3xl font-bold mb-4">Вы ветеринарный врач?</h2>
        <p className="text-slate-300 mb-8 max-w-2xl mx-auto">
          Присоединяйтесь к платформе, подтвердите квалификацию и получите удобные инструменты для ведения пациентов. 
          Забудьте о бумажной волоките.
        </p>
        <Link 
          href="/auth/register?role=vet" 
          className="inline-block px-8 py-3 bg-white text-slate-900 font-bold rounded-xl hover:bg-blue-50 transition-colors"
        >
          Стать партнером
        </Link>
      </div>
    </section>
  );
};