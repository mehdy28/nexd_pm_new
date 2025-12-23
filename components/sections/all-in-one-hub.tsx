


import Image from "next/image";

export const AllInOneHub = () => {
  return (
    <section className="bg-white py-0 sm:py-0">
      <div className="container mx-auto px-4">
        <div className="flex flex-col items-center text-center">
          <Image
            src="/landing/all-in-one.png"
            alt="A collage of product screenshots showing whiteboards, kanban boards, prompt labs, and project documents."
            width={800}
            height={275}
            className="max-w-full h-auto"
          />
          <h2 className="mt-12 text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
            The All-In-One Hub
          </h2>
                    <p className="mt-6 max-w-2xl text-lg leading-8 text-gray-600">
            Get everything you expect from a modern PM tool: Kanban boards, list
            views, Gantt charts, Notion-style documents, and integrated team chat.
          </p>
        </div>
      </div>
    </section>
  );
};
