# Проект «Домовой Тролль»

- Стек: React, TypeScript, Tailwind CSS, Lucide-react.
- UI: VK Desktop Web style with #edeef0 surfaces, headers, inputs, avatars, unread badges, and online statuses.
- Event Queue simulates NPC typing for 2–5 seconds; no instant bot replies.
- Separate static background noise, Director LLM, and Actor LLM; validate all model JSON strictly.
- Keep resident messages short, colloquial, typo-friendly, and free of literary assistant phrasing.

Handlers: `directorHandler`, `actorPromptHandler`, `jsonValidatorHandler`, `messageQueueDispatcher`, `backgroundNoiseService`, `trollScoreCalculator`.
