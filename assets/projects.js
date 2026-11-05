(() => {
  const grid = document.querySelector('[data-projects]');
  if (!grid) return;

  const category = grid.dataset.projects;
  if (category !== 'ai' && category !== 'independent') return;

  const safeLink = value => {
    if (typeof value !== 'string' || !value.trim()) return null;
    try {
      const url = new URL(value, window.location.href);
      return ['http:', 'https:'].includes(url.protocol) ? url.href : null;
    } catch (_) { return null; }
  };

  const textNode = (tag, content, className) => {
    const el = document.createElement(tag);
    el.textContent = content;
    if (className) el.className = className;
    return el;
  };

  function showMessage(title, description, includeGithub) {
    const state = document.createElement('div');
    state.className = 'empty-state';
    state.append(textNode('h3', title), textNode('p', description));
    if (includeGithub) {
      const link = textNode('a', 'Explore my GitHub ↗', 'button secondary');
      link.href = 'https://github.com/spencerveen';
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      state.append(link);
    }
    grid.replaceChildren(state);
  }

  function createCard(project) {
    const card = document.createElement('article');
    card.className = 'project-card' + (project.featured ? ' is-featured' : '');
    card.append(textNode('span', project.featured ? 'Featured project' : (project.subtitle || 'Portfolio project'), 'mini eyebrow'));
    card.append(textNode('h3', project.title || 'Untitled project'));
    if (project.description) card.append(textNode('p', project.description));

    if (Array.isArray(project.tags) && project.tags.length) {
      const tags = document.createElement('div');
      tags.className = 'tag-list';
      project.tags.forEach(tag => {
        if (typeof tag === 'string' && tag.trim()) tags.append(textNode('span', tag, 'tag'));
      });
      card.append(tags);
    }

    const url = safeLink(project.url);
    if (url) {
      const actions = document.createElement('div');
      actions.className = 'project-actions';
      const link = textNode('a', (project.button || 'View project') + ' ↗');
      link.href = url;
      if (new URL(url).origin !== location.origin) {
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
      }
      actions.append(link);
      card.append(actions);
    }
    return card;
  }

  fetch('/projects.json', { cache: 'no-store' })
    .then(response => {
      if (!response.ok) throw new Error('Project list unavailable');
      return response.json();
    })
    .then(data => {
      const projects = Array.isArray(data[category]) ? data[category] : [];
      const valid = projects.filter(p => p && typeof p === 'object');
      if (!valid.length) {
        showMessage(
          category === 'ai' ? 'The next AI project is on its way.' : 'The independent project gallery is ready.',
          category === 'ai'
            ? 'More projects will appear here as they are released.'
            : 'I am curating the independent software, security, and IT projects I want to showcase here.',
          category === 'independent'
        );
        return;
      }
      grid.replaceChildren(...valid.map(createCard));
    })
    .catch(() => showMessage('Unable to load projects right now.', 'Please refresh the page to try again.', false));
})();
