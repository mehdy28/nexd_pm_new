import React from 'react';

const features = [
  {
    title: 'Build Live, Data-Driven Prompts.',
    description:
      "Use our drag-and-drop editor to create dynamic prompts. Pull real-time data—like 'all high-priority tasks in the current sprint' or 'user feedback from this document'—directly into your prompts with Intelligent Variables.",
    imageUrl: '/landing/prompt-lab.png',
    imageAlt: 'Screenshot of the prompt editor showing dynamic, data-driven prompts being built.',
  },
  {
    title: 'From Whiteboard to Working Prompt.',
    description:
      'Design system architecture or user flows in our Excalidraw-powered whiteboard. With one click, capture the visual and generate a structured prompt to explain, document, or build it.',
    imageUrl: '/landing/whiteboard-prompt.png',
    imageAlt: 'An architecture diagram on a whiteboard with a prompt generation modal open.',
  },
];



export const TheSolution = () => {
  return (
    <div id="features" className="bg-slate-50 py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <img src="/landingpage/logo.png" alt="nexd.pm logo" className="mx-auto h-16 w-auto" />
          <h2 className="mt-4 text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">
            Where Your Project Becomes the Prompt.
          </h2>
          <p className="mt-6 text-lg leading-8 text-slate-600">
            nexd.pm integrates powerful AI capabilities directly into a robust project management suite, creating a single source of truth that thinks with you.
          </p>
        </div>
        <div className="mt-16 sm:mt-20 lg:mt-24">
          <div className="space-y-20 lg:space-y-28">
            {features.map((feature, index) => (
              <div
                key={feature.title}
                className="grid grid-cols-1 items-center gap-y-16 lg:grid-cols-2 lg:gap-x-16"
              >
                <div className={`text-center lg:text-left ${index % 2 === 1 ? 'lg:col-start-2' : ''}`}>
                  <h3 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                    {feature.title}
                  </h3>
                  <p className="mt-6 text-lg leading-8 text-slate-600">
                    {feature.description}
                  </p>
                </div>
                <div className={`${index % 2 === 1 ? 'lg:col-start-1 lg:row-start-1' : ''}`}>
                  <div>
                    <img
                      src={feature.imageUrl}
                      alt={feature.imageAlt}
                      className="w-full scale-110 "
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
