"use strict";

/* ---------- Sistema de arquivos ---------- */

const GITHUB = "https://github.com/igornunesfontoura";
const EMAIL = "igorfontoura0702@gmail.com";

const link = (url, texto) => `<a href="${url}" target="_blank" rel="noopener">${texto}</a>`;

const pasta = (descricao, filhos) => ({ tipo: "pasta", descricao, filhos });
const arquivo = (html) => ({ tipo: "arquivo", html });

const raiz = pasta("", {
  sobre: pasta("quem sou eu", {
    "sobre.md": arquivo(`
      <h1>Igor Nunes</h1>
      <p>Sou de Porto Alegre/RS e crio software por conta própria: observo o meu dia a dia, percebo onde uma ferramenta poderia ajudar e coloco a mão na massa até a ideia sair do papel.</p>
      <p>Faço o curso Técnico em Desenvolvimento de Sistemas no Senac, onde me conectei com o Java. Antes disso, aprendi Python, JavaScript, HTML e CSS em cursos e vídeos. Também gosto de criar jogos.</p>
      <p>Meu objetivo é criar projetos que as pessoas realmente usem e ter liberdade para continuar criando.</p>
      <h2>Tecnologias</h2>
      <p><span class="tag">Java</span> · <span class="tag">Kotlin</span> · <span class="tag">Python</span> · <span class="tag">JavaScript</span> · <span class="tag">HTML</span> · <span class="tag">CSS</span></p>
    `),
  }),
  projetos: pasta("o que eu criei", {
    overcam: pasta("clipes por cima da webcam em chamadas no Linux", {
      "README.md": arquivo(`
        <h1>overcam</h1>
        <p>Toca um clipe de vídeo e áudio por cima da webcam durante chamadas no Linux. Quem está do outro lado vê o clipe no lugar da sua imagem e ouve o áudio misturado com o seu microfone.</p>
        <p>Nasceu para divertir os amigos em chamadas no Discord, criando momentos inusitados no meio da conversa.</p>
        <ul>
          <li><span class="chave">stack</span>Python, GStreamer, PipeWire, v4l2loopback</li>
          <li><span class="chave">código</span>${link(`${GITHUB}/overcam`, "github.com/igornunesfontoura/overcam")}</li>
        </ul>
      `),
    }),
    songlog: pasta("avaliação de álbuns faixa por faixa", {
      "README.md": arquivo(`
        <h1>SongLog</h1>
        <p>Aplicação desktop para avaliar álbuns faixa por faixa. A nota do álbum sai das notas de cada faixa, com mais peso para as mais longas, e cada usuário mantém um diário do que ouviu.</p>
        <p>Nasceu como Projeto Integrador do curso técnico no Senac.</p>
        <ul>
          <li><span class="chave">stack</span>Java, Swing, MySQL, JDBC</li>
          <li><span class="chave">código</span>${link(`${GITHUB}/SongLog`, "github.com/igornunesfontoura/SongLog")}</li>
        </ul>
      `),
    }),
    "controle-remoto": pasta("teclado e touchpad Bluetooth no celular", {
      "README.md": arquivo(`
        <h1>Controle Remoto</h1>
        <p>App Android que transforma o celular em teclado, touchpad e controle de mídia Bluetooth para o computador. O computador enxerga o celular como um teclado e mouse comuns, então não precisa instalar nada do outro lado.</p>
        <p>Nasceu porque eu assisto filmes no notebook ligado à TV e cansei de levantar do sofá para colocar em tela cheia ou aumentar o volume.</p>
        <ul>
          <li><span class="chave">stack</span>Kotlin, Jetpack Compose, Bluetooth HID</li>
          <li><span class="chave">código</span>${link(`${GITHUB}/ControleRemoto`, "github.com/igornunesfontoura/ControleRemoto")}</li>
        </ul>
      `),
    }),
  }),
  contato: pasta("fale comigo", {
    "contato.txt": arquivo(`
      <h1>Contato</h1>
      <p>Quer conversar sobre um projeto ou uma ideia? Me manda um e-mail.</p>
      <ul>
        <li><span class="chave">e-mail</span><a href="mailto:${EMAIL}">${EMAIL}</a></li>
        <li><span class="chave">github</span>${link(GITHUB, "github.com/igornunesfontoura")}</li>
      </ul>
    `),
  }),
});

/* ---------- Estado e elementos ---------- */

const $ = (id) => document.getElementById(id);
const saida = $("saida");
const tela = $("tela");
const form = $("form");
const entrada = $("entrada");
const promptEl = $("prompt");
const tituloEl = $("titulo");

let cwd = [];              // caminho atual, ex.: ["projetos", "overcam"]
const historico = [];
let posHistorico = 0;
let ocupado = false;       // true durante a animação de abertura
let pularAnimacao = false; // termina a abertura na hora (clique no fundo)
let interrompido = false;  // o visitante executou algo durante a abertura: ela para por ali

const reduzirMovimento = matchMedia("(prefers-reduced-motion: reduce)").matches;
const ponteiroFino = matchMedia("(pointer: fine)").matches;

const caminhoTexto = (segs) => (segs.length ? "~/" + segs.join("/") : "~");

const promptHtml = (segs) =>
  `<span class="u">igor</span>@<span class="h">portfolio</span>:<span class="p">${caminhoTexto(segs)}</span>$`;

function no(segs) {
  let atual = raiz;
  for (const s of segs) {
    if (atual.tipo !== "pasta" || !atual.filhos[s]) return null;
    atual = atual.filhos[s];
  }
  return atual;
}

/** Resolve um caminho digitado (relativo, ~, .., /) para uma lista de segmentos. */
function resolver(caminho) {
  let segs = [...cwd];
  let resto = caminho;
  if (resto.startsWith("~") || resto.startsWith("/")) {
    segs = [];
    resto = resto.replace(/^~?\/*/, "");
  }
  for (const parte of resto.split("/")) {
    if (!parte || parte === ".") continue;
    if (parte === "..") segs.pop();
    else {
      // Aceita "songlog", "SongLog" ou "readme.md", mas guarda o nome real
      const atual = no(segs);
      const filhos = atual && atual.tipo === "pasta" ? Object.keys(atual.filhos) : [];
      segs.push(filhos.find((n) => n.toLowerCase() === parte.toLowerCase()) || parte);
    }
  }
  return no(segs) ? segs : null;
}

/** Comando que um clique numa pasta/arquivo executa, relativo ao diretório atual quando possível. */
function comandoPara(segs) {
  const alvo = no(segs);
  const pai = segs.slice(0, -1);
  const nome = segs[segs.length - 1];
  const caminho = pai.join("/") === cwd.join("/") ? nome : caminhoTexto(segs);
  if (alvo.tipo === "arquivo") return `cat ${caminho}`;
  const arquivos = Object.keys(alvo.filhos).filter((n) => alvo.filhos[n].tipo === "arquivo");
  const unico = Object.keys(alvo.filhos).length === 1 && arquivos.length === 1;
  return unico ? `cd ${caminho} && cat ${arquivos[0]}` : `cd ${caminho} && ls`;
}

/* ---------- Saída ---------- */

function elemento(tag, classe, html) {
  const el = document.createElement(tag);
  if (classe) el.className = classe;
  if (html !== undefined) el.innerHTML = html;
  return el;
}

const texto = (classe, conteudo) => {
  const el = elemento("div", "resultado " + (classe || ""));
  el.textContent = conteudo;
  return el;
};

function botaoItem(segs) {
  const alvo = no(segs);
  const nome = segs[segs.length - 1];
  const b = elemento("button", "item " + alvo.tipo);
  b.type = "button";
  b.textContent = alvo.tipo === "pasta" ? nome + "/" : nome;
  b.addEventListener("click", () => executar(comandoPara(segs)));
  return b;
}

function listar(segs) {
  const alvo = no(segs);
  const nomes = Object.keys(alvo.filhos); // ordem em que foram declarados: sobre, projetos, contato
  const comDescricao = nomes.some((n) => alvo.filhos[n].descricao);
  const lista = elemento("div", "resultado " + (comDescricao ? "lista detalhada" : "lista"));
  for (const n of nomes) {
    lista.append(botaoItem([...segs, n]));
    if (comDescricao) lista.append(texto("dica", alvo.filhos[n].descricao ? "# " + alvo.filhos[n].descricao : ""));
  }
  return lista;
}

function arvore(segs, prefixo = "") {
  const alvo = no(segs);
  const linhas = [];
  const nomes = Object.keys(alvo.filhos);
  nomes.forEach((n, i) => {
    const ultimo = i === nomes.length - 1;
    const filho = alvo.filhos[n];
    const linha = elemento("div", "resultado");
    linha.append(document.createTextNode(prefixo + (ultimo ? "└── " : "├── ")));
    linha.append(botaoItem([...segs, n]));
    linhas.push(linha);
    if (filho.tipo === "pasta") linhas.push(...arvore([...segs, n], prefixo + (ultimo ? "    " : "│   ")));
  });
  return linhas;
}

/* ---------- Comandos ---------- */

const AJUDA = [
  ["ls [pasta]", "lista o conteúdo"],
  ["cd <pasta>", "entra numa pasta (cd .. volta)"],
  ["cat <arquivo>", "mostra um arquivo"],
  ["tree", "mostra todas as pastas"],
  ["pwd", "mostra onde você está"],
  ["whoami", "quem sou eu, em uma linha"],
  ["history", "comandos que você digitou"],
  ["clear", "limpa a tela"],
];

const comandos = {
  help() {
    const el = elemento("div", "resultado doc");
    el.innerHTML =
      "<ul>" +
      AJUDA.map(([c, d]) => `<li><span class="chave" style="min-width:16ch">${c}</span>${d}</li>`).join("") +
      "</ul><p class=\"dica\">Dica: clique nas pastas e arquivos, use Tab para completar e ↑/↓ para o histórico.</p>";
    return [el];
  },

  ls(args) {
    const segs = args[0] ? resolver(args[0]) : cwd;
    if (!segs) return [texto("erro", `ls: não foi possível acessar '${args[0]}': arquivo ou pasta não encontrado`)];
    if (no(segs).tipo === "arquivo") return [texto("", segs[segs.length - 1])];
    return [listar(segs)];
  },

  cd(args) {
    const segs = args[0] ? resolver(args[0]) : [];
    if (!segs) return [texto("erro", `cd: ${args[0]}: arquivo ou pasta não encontrado`)];
    if (no(segs).tipo !== "pasta") return [texto("erro", `cd: ${args[0]}: não é uma pasta`)];
    cwd = segs;
    return [];
  },

  cat(args) {
    if (!args[0]) return [texto("erro", "cat: informe um arquivo (ex.: cat sobre/sobre.md)")];
    const segs = resolver(args[0]);
    if (!segs) return [texto("erro", `cat: ${args[0]}: arquivo ou pasta não encontrado`)];
    const alvo = no(segs);
    if (alvo.tipo === "pasta") return [texto("erro", `cat: ${args[0]}: é uma pasta`)];
    return [elemento("div", "resultado doc", alvo.html)];
  },

  tree() {
    return [texto("p", "~"), ...arvore([])];
  },

  pwd() {
    return [texto("", "/home/igor" + (cwd.length ? "/" + cwd.join("/") : ""))];
  },

  whoami() {
    return [texto("", "Igor Nunes · Porto Alegre/RS · crio ferramentas para problemas do meu dia a dia")];
  },

  history() {
    return [texto("", historico.map((c, i) => `${String(i + 1).padStart(4)}  ${c}`).join("\n"))];
  },

  echo(args) {
    return [texto("", args.join(" "))];
  },

  sudo() {
    return [texto("erro", "igor não está no arquivo sudoers. Este incidente será reportado. 😉")];
  },

  rm() {
    return [texto("erro", "rm: permissão negada. Este portfólio é somente leitura.")];
  },

  exit() {
    return [texto("", "Ainda tem coisa pra ver por aqui. Digite help.")];
  },
};

/* ---------- Execução ---------- */

function atualizarPrompt() {
  promptEl.innerHTML = promptHtml(cwd);
  tituloEl.textContent = `igor@portfolio: ${caminhoTexto(cwd)}`;
  document.querySelectorAll(".atalhos button").forEach((b) => {
    const destino = b.dataset.cmd.match(/^cd (\S+)/)[1].replace(/^~\/?/, "");
    b.setAttribute("aria-current", String(destino === (cwd[0] || "")));
  });
  // A pasta atual vai para o endereço (#/projetos/overcam), para dar para compartilhar o link
  const hash = cwd.length ? "#/" + cwd.join("/") : "";
  if (location.hash !== hash) history.replaceState(null, "", hash || location.pathname + location.search);
}

function rolarParaFim() {
  tela.scrollTop = tela.scrollHeight;
}

function executar(linha, { salvarHistorico = false, daAbertura = false } = {}) {
  linha = linha.trim();
  if (ocupado && !daAbertura) interrompido = true;
  if (salvarHistorico && linha) {
    historico.push(linha);
    posHistorico = historico.length;
  }

  const bloco = elemento("div", "bloco");
  const eco = elemento("p", "eco");
  eco.innerHTML = promptHtml(cwd) + " ";
  eco.append(document.createTextNode(linha));
  bloco.append(eco);

  for (const parte of linha.split("&&").map((p) => p.trim()).filter(Boolean)) {
    const [nome, ...args] = parte.split(/\s+/);
    if (nome === "clear") {
      saida.replaceChildren();
      atualizarPrompt();
      return;
    }
    const cmd = Object.hasOwn(comandos, nome) ? comandos[nome] : null;
    const resultado = cmd
      ? cmd(args)
      : [texto("erro", `${nome}: comando não encontrado. Digite help para ver os comandos.`)];
    bloco.append(...resultado);
    if (resultado.some((el) => el.classList.contains("erro"))) break;
  }

  saida.append(bloco);
  atualizarPrompt();
  rolarParaFim();
  if (ponteiroFino) entrada.focus({ preventScroll: true });
}

/* ---------- Autocompletar ---------- */

function completar() {
  const valor = entrada.value;
  const partes = valor.split(/\s+/);
  const ultimo = partes[partes.length - 1];
  let opcoes;

  if (partes.length === 1) {
    opcoes = Object.keys(comandos).concat("clear").filter((c) => c.startsWith(ultimo));
  } else {
    const barra = ultimo.lastIndexOf("/");
    const base = barra >= 0 ? ultimo.slice(0, barra + 1) : "";
    const inicio = ultimo.slice(barra + 1);
    const segs = base ? resolver(base) : cwd;
    const alvo = segs && no(segs);
    if (!alvo || alvo.tipo !== "pasta") return;
    opcoes = Object.keys(alvo.filhos)
      .filter((n) => n.startsWith(inicio))
      .map((n) => base + n + (alvo.filhos[n].tipo === "pasta" ? "/" : ""));
  }

  if (opcoes.length === 1) {
    partes[partes.length - 1] = opcoes[0] + (opcoes[0].endsWith("/") ? "" : " ");
    entrada.value = partes.join(" ");
  } else if (opcoes.length > 1) {
    const bloco = elemento("div", "bloco");
    const eco = elemento("p", "eco", promptHtml(cwd) + " ");
    eco.append(document.createTextNode(valor));
    bloco.append(eco, texto("dica", opcoes.join("   ")));
    saida.append(bloco);
    rolarParaFim();
  }
}

/* ---------- Eventos ---------- */

form.addEventListener("submit", (e) => {
  e.preventDefault();
  const linha = entrada.value;
  entrada.value = "";
  executar(linha, { salvarHistorico: true });
});

entrada.addEventListener("keydown", (e) => {
  if (e.key === "Tab") {
    e.preventDefault();
    completar();
  } else if (e.key === "ArrowUp" && historico.length) {
    e.preventDefault();
    posHistorico = Math.max(0, posHistorico - 1);
    entrada.value = historico[posHistorico];
  } else if (e.key === "ArrowDown" && historico.length) {
    e.preventDefault();
    posHistorico = Math.min(historico.length, posHistorico + 1);
    entrada.value = historico[posHistorico] || "";
  } else if (e.ctrlKey && e.key.toLowerCase() === "l") {
    e.preventDefault();
    executar("clear");
  } else if (e.ctrlKey && e.key.toLowerCase() === "c" && entrada.selectionStart === entrada.selectionEnd) {
    // Ctrl+C sem texto selecionado cancela a linha, como no terminal; com seleção, copia normalmente
    e.preventDefault();
    const bloco = elemento("div", "bloco");
    const eco = elemento("p", "eco", promptHtml(cwd) + " ");
    eco.append(document.createTextNode(entrada.value + "^C"));
    bloco.append(eco);
    saida.append(bloco);
    entrada.value = "";
    rolarParaFim();
  }
});

document.querySelectorAll(".atalhos button").forEach((b) =>
  b.addEventListener("click", () => executar(b.dataset.cmd))
);

// Clicar no fundo do terminal foca a linha de comando (sem atrapalhar seleção de texto e links).
tela.addEventListener("click", (e) => {
  if (ocupado) {
    pularAnimacao = true;
    return;
  }
  if (e.target.closest("a, button") || getSelection().toString()) return;
  entrada.focus({ preventScroll: true });
});

/* ---------- Abertura ---------- */

const esperar = (ms) => new Promise((r) => setTimeout(r, ms));

async function digitar(linha) {
  if (interrompido) return;
  if (reduzirMovimento || pularAnimacao) {
    executar(linha, { daAbertura: true });
    return;
  }
  const bloco = elemento("div", "bloco");
  const eco = elemento("p", "eco", promptHtml(cwd) + " ");
  const digitado = document.createTextNode("");
  const cursor = elemento("span", "cursor", "&nbsp;");
  eco.append(digitado, cursor);
  bloco.append(eco);
  saida.append(bloco);
  await esperar(350);
  for (const c of linha) {
    if (pularAnimacao || interrompido) break;
    digitado.data += c;
    await esperar(55 + Math.random() * 50);
  }
  if (!pularAnimacao && !interrompido) await esperar(250);
  bloco.remove();
  if (!interrompido) executar(linha, { daAbertura: true });
}

async function abertura() {
  // Lê o link direto (#/projetos/overcam) antes de atualizarPrompt() reescrever o endereço
  const destino = decodeURIComponent(location.hash.replace(/^#\/?/, ""));
  const segs = destino ? resolver(destino) : null;
  atualizarPrompt();
  if (segs && segs.length) {
    executar(comandoPara(segs));
    return;
  }

  ocupado = true;
  form.classList.add("ocupado");
  await digitar("whoami");
  await digitar("ls");
  if (!interrompido) {
    const dica = ponteiroFino
      ? "Clique numa pasta ou digite help para ver os comandos."
      : "Toque numa pasta para abrir, ou digite help.";
    saida.lastElementChild.append(texto("dica destaque", dica));
  }
  ocupado = false;
  form.classList.remove("ocupado");
  rolarParaFim();
  if (ponteiroFino) entrada.focus({ preventScroll: true });
}

abertura();
