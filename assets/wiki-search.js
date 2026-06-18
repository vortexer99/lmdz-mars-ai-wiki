const overlay = document.querySelector("[data-search-overlay]");
const openButton = document.querySelector("[data-search-open]");
const closeButton = document.querySelector("[data-search-close]");
const input = document.querySelector("[data-search-input]");
const statusNode = document.querySelector("[data-search-status]");
const resultsNode = document.querySelector("[data-search-results]");

let pagefindPromise = null;
let lastQuery = "";

function pagefindBasePath() {
  const scriptUrl = new URL(import.meta.url);
  return new URL("../pagefind/pagefind.js", scriptUrl).href;
}

function loadPagefind() {
  if (!pagefindPromise) {
    pagefindPromise = import(pagefindBasePath());
  }
  return pagefindPromise;
}

function openSearch() {
  overlay.hidden = false;
  document.body.classList.add("search-open");
  input.focus();
  input.select();
}

function closeSearch() {
  overlay.hidden = true;
  document.body.classList.remove("search-open");
  openButton.focus();
}

function clearResults(message) {
  statusNode.textContent = message;
  resultsNode.replaceChildren();
}

function resultTitle(data) {
  return data.meta?.title || data.url.replace(/^\.\//, "");
}

function renderResult(data) {
  const item = document.createElement("a");
  item.className = "search-result";
  item.href = data.url;

  const title = document.createElement("span");
  title.className = "search-result-title";
  title.textContent = resultTitle(data);

  const excerpt = document.createElement("span");
  excerpt.className = "search-result-excerpt";
  excerpt.innerHTML = data.excerpt || "";

  item.append(title, excerpt);
  return item;
}

async function runSearch(query) {
  lastQuery = query;
  if (!query) {
    clearResults("输入关键词开始搜索。");
    return;
  }

  statusNode.textContent = "搜索中...";
  try {
    const pagefind = await loadPagefind();
    const search = await pagefind.search(query);
    if (lastQuery !== query) {
      return;
    }

    if (!search.results.length) {
      clearResults("没有找到结果。");
      return;
    }

    const data = await Promise.all(search.results.slice(0, 20).map((result) => result.data()));
    if (lastQuery !== query) {
      return;
    }

    statusNode.textContent = `找到 ${search.results.length} 个结果。`;
    resultsNode.replaceChildren(...data.map(renderResult));
  } catch (error) {
    clearResults("搜索索引未加载。请通过 GitHub Pages 或本地 HTTP 服务访问。");
    console.error(error);
  }
}

function debounce(fn, delay) {
  let timer = 0;
  return (...args) => {
    window.clearTimeout(timer);
    timer = window.setTimeout(() => fn(...args), delay);
  };
}

const debouncedSearch = debounce((event) => {
  runSearch(event.target.value.trim());
}, 120);

openButton.addEventListener("click", openSearch);
closeButton.addEventListener("click", closeSearch);
input.addEventListener("input", debouncedSearch);
overlay.addEventListener("click", (event) => {
  if (event.target === overlay) {
    closeSearch();
  }
});
document.addEventListener("keydown", (event) => {
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
    event.preventDefault();
    openSearch();
  } else if (event.key === "Escape" && !overlay.hidden) {
    closeSearch();
  }
});
