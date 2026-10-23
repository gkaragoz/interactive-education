import { h, type ModuleSession } from '../core';

export interface PromptPanel {
  /** "Kendini dene" list with the tally (lives in the side drawer). */
  list: HTMLElement;
  /** The question that fired at the playhead; shown over the stage while it is open. */
  overlay: HTMLElement;
  update(): void;
}

/** "Kendini dene" and "Tahmin et": the prompt that fired at the playhead, plus the list of all questions and the tally. */
export function createPromptPanel(session: ModuleSession): PromptPanel {
  const tally = h('p', { class: 'tally', 'aria-live': 'polite' });
  const listTally = h('p', { class: 'tally-list' });
  const prompt = h('div', { class: 'prompt', role: 'dialog', 'aria-label': 'Soru' });
  const overlay = h('div', { class: 'prompt-overlay floating-keep' }, prompt, tally);
  overlay.hidden = true;
  const list = h('ol', { class: 'question-list' });
  for (const q of session.questions) {
    list.append(h('li', {}, h('button', { type: 'button', class: 'link-btn', 'data-check': q.id, onclick: () => session.openCheck(q.id) }, `${Math.round(q.atTime)}. sn: ${q.promptTr}`)));
  }
  const offNote = h('p', { class: 'off-note' }, 'Sorular kapalı: animasyon sorular için durmaz. Buradan istediğini kendin açabilirsin.');
  const empty = h('p', { class: 'empty-note' }, 'Bu animasyon için soru yok.');
  empty.hidden = session.questions.length > 0;
  const el = h('section', { class: 'card prompts', 'aria-labelledby': 'h-try' }, h('h2', { class: 'card-title', id: 'h-try' }, 'Kendini dene'), offNote, listTally, list, empty);

  const renderPrompt = (): void => {
    const p = session.prompt;
    prompt.replaceChildren();
    overlay.hidden = p === null;
    if (!p) return;
    if (p.kind === 'check') {
      const answered = p.answered !== null;
      prompt.append(
        h('p', { class: 'q' }, p.check.promptTr),
        h(
          'div',
          { class: 'options', role: 'group' },
          ...p.check.options.map((text, i) =>
            h('button', {
              type: 'button',
              class: `option${answered && i === p.check.correctIndex ? ' right' : ''}${answered && i === p.answered && i !== p.check.correctIndex ? ' wrong' : ''}`,
              disabled: answered,
              onclick: () => session.answer(i),
            }, text),
          ),
        ),
      );
      if (answered) {
        const right = p.answered === p.check.correctIndex;
        prompt.append(h('p', { class: 'feedback', role: 'status' }, `${right ? 'Doğru! ' : 'Tam değil. '}${p.check.explanationTr}`), h('button', { type: 'button', class: 'primary-btn', 'data-continue': '', onclick: () => session.dismiss(true) }, 'Devam et'));
      }
    } else {
      prompt.append(h('p', { class: 'q' }, p.predict.promptTr));
      if (!p.revealed) prompt.append(h('button', { type: 'button', class: 'primary-btn', 'data-reveal': '', onclick: () => session.reveal() }, 'Cevabı göster'));
      else prompt.append(h('p', { class: 'feedback', role: 'status' }, p.predict.answerTr), h('button', { type: 'button', class: 'primary-btn', 'data-continue': '', onclick: () => session.dismiss(true) }, 'Devam et'));
    }
  };

  return {
    list: el,
    overlay,
    update(): void {
      renderPrompt();
      const text = session.tally.answered === 0 ? 'Henüz soru cevaplamadın.' : `${session.tally.correct} / ${session.tally.answered} doğru`;
      tally.textContent = text;
      listTally.textContent = text;
    },
  };
}
