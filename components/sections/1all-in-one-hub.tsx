import React from 'react';

export const NewAllInOneHub = () => {
  return (
    <section className="flex flex-col items-center justify-center bg-white py-10 pt-0 px-6 text-center">
      <div className="">
        <img
          src="/landing/all-in-one.png"
          alt="All-in-one hub with Kanban boards, Gantt charts, documents, and team chat."
          className="block h-auto max-w-full w-[960px]"
        />
      </div>
      <div className="w-full max-w-[720px]">
        <h2 className="mb-4 text-[42px] font-bold text-gray-900">
          Your All-in-One Hub
        </h2>
        <p className="text-xl leading-relaxed text-gray-700">
          Innovation doesn't mean compromise. Get everything you expect from a modern PM tool: 
          Kanban boards, list views, Gantt charts, documents, whiteboards, and integrated team chat. And more... All in one place.
        </p>
      </div>
    </section>
  );
};
