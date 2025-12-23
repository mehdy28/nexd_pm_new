import Image from "next/image";

export function NewHero() {
  return (
    <section className="bg-[#f0f2f7] flex items-center min-h-[calc(100vh-5rem)]">
      <div className="mx-auto max-w-7xl px-6 lg:px-8 py-12 sm:py-16">
        <div className="grid grid-cols-1 items-center gap-x-16 gap-y-12 lg:grid-cols-5">
          <div className="text-center lg:text-left lg:col-span-2">
            <h1 className="text-4xl font-extrabold tracking-tight text-gray-900 sm:text-5xl lg:text-6xl">
              Project Management for your AI Workflow.
            </h1>
            <p className="mt-6 text-lg leading-8 text-gray-600">
              Stop manually inserting project data into your AI tools. nexd.pm connects your tasks, documents,  diagrams directly to a powerful prompt engineering lab.
            </p>
            <div className="mt-10 flex flex-col items-center gap-y-0 lg:items-start">
              <a
                href="#"
                className="rounded-full bg-blue-600 px-8  py-3.5 text-base font-semibold text-white shadow-sm hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
              >
                Start Free Trial
              </a>

            </div>
          </div>
          <div className="lg:col-span-3">
            <Image
              src="/landing/hero1.png"
              alt="Project management dashboard screenshot"
              width={1400}
              height={900}
              priority
              className="rounded-lg"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
