import '@fontsource/cormorant-garamond/latin-400.css';
import '@fontsource/cormorant-garamond/latin-ext-400.css';
import '@fontsource/cormorant-garamond/latin-500.css';
import '@fontsource/cormorant-garamond/latin-ext-500.css';
import '@fontsource/cormorant-garamond/latin-600.css';
import '@fontsource/cormorant-garamond/latin-ext-600.css';
import '@fontsource/cormorant-garamond/latin-700.css';
import '@fontsource/cormorant-garamond/latin-ext-700.css';
import '@fontsource/cormorant-garamond/latin-400-italic.css';
import '@fontsource/cormorant-garamond/latin-ext-400-italic.css';
import '@fontsource/caveat/latin-500.css';
import '@fontsource/caveat/latin-ext-500.css';
import '@fontsource/caveat/latin-600.css';
import '@fontsource/caveat/latin-ext-600.css';
import { startApp } from './app';
import { cells, kazanimlar, micrographs, organelles, sources } from './data';

const root = document.getElementById('app');
if (!root) throw new Error('#app missing');

startApp({
  root,
  data: { sources, kazanimlar, organelles, cells, micrographs },
  baseUrl: import.meta.env.BASE_URL,
  search: location.search,
  hash: location.hash,
}).catch((error: unknown) => {
  console.error(error);
  root.textContent = 'Uygulama başlatılamadı. Sayfayı yenilemeyi dene.';
});
