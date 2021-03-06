import React from 'react';
import Editor, { OnMount } from "@monaco-editor/react";

import ReactMarkdown from 'react-markdown'
import remarkMath from 'remark-math'
import rehypeKatex from 'rehype-katex'

import 'katex/dist/katex.min.css';

import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { Device } from '@capacitor/device';
import { Share } from '@capacitor/share';
import { StatusBar } from '@capacitor/status-bar';

const MATHLINGUA_KEY = 'book.md';
const URL_SEARCH_PREFIX = '?filename=';

const COLOR_KEY = 'mlg-color';
const FONT_KEY = 'mlg-font';
const RETRO_KEY = 'mlg-retro';
const FUZZ_KEY = 'mlg-fuzz';
const THEME_KEY = 'mlg-theme';

const COLORS = [
  '#ce9178', // orange
  '#b8b8b8', // gray
  '#54ba4e', // green
  '#00ffff',
  '#333333',
];

const FONTS = [
  'AcPlus_IBM_VGA_8x14',
  'IBM_DOS_ISO9',
  'Flexi_IBM_VGA_True_437',
  'Flexi_IBM_VGA_True',
  'TerminusTTF',
  'Glass_TTY_VT220',
  'Monospace',
];

export function App() {
  const search = window.location.search;
  const basePath = window.location.origin.replace('3000', '8080');
  let urlFilename: string|undefined = undefined;
  if (search && search.startsWith(URL_SEARCH_PREFIX)) {
    urlFilename = search.substring(URL_SEARCH_PREFIX.length);
  }

  const filename = urlFilename ?? MATHLINGUA_KEY;
  const [text, setText] = React.useState('');
  const [status, setStatus] = React.useState('');
  const [rawFontSize, setRawFontSize] = React.useState(26);
  const [theme, setTheme] = React.useState(window.localStorage.getItem(THEME_KEY) || 'light2');
  const [fontFamily, setFontFamily] = React.useState(window.localStorage.getItem(FONT_KEY) || FONTS[2]);
  const [language, setLanguage] = React.useState('markdown');
  const [controlsShown, setControlsShown] = React.useState(false);
  const [color, setColor] = React.useState(window.localStorage.getItem(COLOR_KEY) || COLORS[1]);
  const [showEditor, setShowEditor] = React.useState(true);
  const storedRetro = window.localStorage.getItem(RETRO_KEY);
  const [retro, setRetro] = React.useState(storedRetro == null ? true : storedRetro === 'true');
  const storedFuzz = window.localStorage.getItem(FUZZ_KEY);
  const initFuzz = storedFuzz == null ? '7' : storedFuzz;
  const [fuzz, setFuzz] = React.useState<string>(initFuzz);

  const [rawFontSizeText, setRawFontSizeText] = React.useState('' + rawFontSize);
  const [languageText, setLanguageText] = React.useState(language);

  React.useEffect(() => {
    try {
      StatusBar.hide();
    } catch {
      // ignore exceptions since StatusBar is not supported on web
    }
  }, []);

  React.useEffect(() => {
    document.body.style.backgroundColor = theme === 'retro' ? '#000000' : '#fbfbfb';
  }, [theme]);

  React.useEffect(() => {
    if (retro) {
      setLanguage('text');
      document.body.style.textShadow = `0 0 1px ${color}, 0 0 ${fuzz}px ${color}`;
      for (let i=0; i<document.styleSheets.length; i++) {
        try {
          document.styleSheets[i].insertRule(`.cursor { box-shadow: 0 0 1px ${color}, 0 0 ${fuzz}px ${color} !important; color: ${darken(color)} !important; }`);
        } catch {
          // ignore errors for modifying cross site stylesheets
        }
      }
    } else {
      setLanguage('markdown');
      document.body.style.textShadow = 'none';
      for (let i=0; i<document.styleSheets.length; i++) {
        try {
          document.styleSheets[i].insertRule(`.cursor { box-shadow: unset !important; color: ${darken(color)} !important; }`);
        } catch {
          // ignore errors for modifying cross site stylesheets
        }
      }
    }
  }, [retro]);

  React.useEffect(() => {
    Device.getInfo()
      .then((info) => {
        if (info.platform === 'web') {
          fetch(`${basePath}/api/read`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              filename,
            })
          }).then(async response => {
            const json = await response.json();
            if (json.error) {
              alert(json.error);
            } else {
              setText(json.text);
          }
          });
        } else {
          Filesystem.readFile({
            path: filename,
            directory: Directory.Documents,
            encoding: Encoding.UTF8,
          }).then(result => setText(result.data))
            .catch(err => alert(err));
        }
      })
      .catch(err => alert(err));
  }, [filename]);

  function registerSaver(monaco: any) {
    const models = monaco.editor.getModels();
    for (const model of models) {
      const validate = () => {
        const val = model.getValue();
        save(val);
      };

      let handle: NodeJS.Timeout | null = null;
      model.onDidChangeContent(() => {
        if (handle) {
          clearTimeout(handle);
        }
        handle = setTimeout(validate, 500);
      });
      validate();
    }
  }

  const save = (content: string) => {
    Device.getInfo()
      .then(info => {
        if (info.platform === 'web') {
          fetch(`${basePath}/api/write`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              filename,
              text: content,
            })
          }).then(async response => {
            const json = await response.json();
            if (json.error) {
              alert(json.error);
            } else {
              setStatus('');
            }
          });
        } else {
          Filesystem.writeFile({
            path: filename,
            data: content,
            directory: Directory.Documents,
            encoding: Encoding.UTF8,
          }).then(() => setStatus(''))
            .catch(err => alert(err));
        }
      })
      .catch(err => alert(err));
  };

  const onMount: OnMount = (editor, monaco: any) => {
    editor.addAction({
      id: 'save-action',
      label: 'save-label',
      keybindings: [
        monaco.KeyMod.chord(
          monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS,
        )
      ],
      precondition: undefined,
      keybindingContext: undefined,
      contextMenuGroupId: 'navigation',
      contextMenuOrder: 1.5,
      run: (editor: any) => {
        save(editor.getModel().getValue());
      }
    });

    monaco.editor.defineTheme('retro', {
      base: 'vs-dark',
      inherit: true,
      rules: [{
        background: '#000000',
        foreground: color,
      }],
      colors: {
        'editor.foreground': color,
        'editor.background': '#000000',
        'editor.selectionBackground': '#222222',
        'editor.selectionHighlightBackground': '#000000',
        'editorCursor.foreground': color,
      }
    });

    monaco.editor.defineTheme('light2', {
      base: 'vs-dark',
      inherit: true,
      rules: [{
        background: '#fbfbfb',
        foreground: color,
      }],
      colors: {
        'editor.foreground': color,
        'editor.background': '#fbfbfb',
        'editor.selectionBackground': '#222222',
        'editor.selectionHighlightBackground': '#fbfbfb',
        'editorCursor.foreground': color,
      }
    });

    configureEditor(monaco);
    registerCompletionProvider(monaco);
    // registerSaver(monaco);
    // this is needed to initially use dark mode since the
    // custom theme needs to be defined before dark mode can be used
    setTheme('retro');
  };

  const light = theme === 'light2';
  const usingRetroFont = fontFamily !== 'Monospace';
  const foreground = light ? '#555555' : color;
  const fontSize = usingRetroFont ? rawFontSize + 7 : rawFontSize;
  const buttonStyle = {
    border: 'none',
    background: 'transparent',
    color: foreground,
    float: 'right',
    marginRight: '1em',
    fontSize,
    fontFamily,
  } as const;

  let component;
  if (showEditor) {
    component = <Editor
      height='92vh'
      language={language}
      theme={light ? 'light2' : 'retro'}
      options={{
        lineNumbers: 'off',
        autoClosingBrackets: 'never',
        autoClosingQuotes: 'never',
        tabSize: 2,
        autoIndent: true,
        quickSuggestions: false,
        minimap: {
          enabled: false
        },
        renderIndentGuides: false,
        renderLineHighlight: false,
        cursorStyle: 'block',
        cursorBlinking: 'solid',
        matchBrackets: 'never',
        wordWrap: true,
        scrollBeyondLastLine: true,
        scrollbar: {
          useShadows: false,
          verticalScrollbarSize: 0,
          horizontalScrollbarSize: 0,
        },
        fontSize,
        fontFamily,
      } as any}
      value={text}
      onMount={onMount}
      onChange={value => {
        setStatus('*');
        setText(value ?? '');
      }}
    />;
  } else {
    component = (
    <div style={{
      width: '90%',
      marginLeft: 'auto',
      marginRight: 'auto',
      color,
      fontFamily,
      fontSize,
    }}>
      <ReactMarkdown
        children={text}
        remarkPlugins={[remarkMath]}
        rehypePlugins={[rehypeKatex]}
      />
    </div>);
  }

  return <div style={{
    width: '99%',
    marginLeft: 'auto',
    marginRight: 'auto',
    border: 'none',
    boxShadow: 'none',
    marginTop: '2vh',
    paddingTop: '0.25em',
    paddingLeft: '1ex',
    backgroundColor: light ? '#fbfbfb' : '#000000',
  }}>
    <div>
      <button
        style={buttonStyle}
        onClick={() => {
          setControlsShown(!controlsShown);
        }}>
          =
      </button>
      <button
        style={buttonStyle}
        onClick={() => {
          setShowEditor(!showEditor);
        }}>
          #
      </button>
      <button
        onClick={async () => {
          if (await Share.canShare()) {
            await Share.share({
              title: filename,
              text,
              dialogTitle: `Share ${filename}`,
            });
          }
        }}
        style={buttonStyle}>
        +
      </button>
      <button
        onClick={() => save(text)}
        style={buttonStyle}>
        {status}
      </button>
      <div style={{
        color: color,
        display: controlsShown ? 'unset' : 'none',
        fontFamily,
        fontSize,
      }}>
        Font Family:&nbsp;
        <select style={{
          border: 'solid',
          borderWidth: '1px',
          borderColor: color,
          background: '#000000',
          color: color,
          fontFamily,
          fontSize,
        }}
        onChange={(event) => {
          setFontFamily(event.target.value);
        }}>
          {
            FONTS.map(fontName => (<option style={{
              background: '#333333',
              border: 'solid',
              borderColor: color,
              borderWidth: '1px',
            }}>
              {fontName ?? 'default'}
            </option>))
          }
        </select>
        &nbsp;Font size:&nbsp;
        <input style={{
          background: '#000000',
          borderWidth: '1px',
          borderColor: color,
          color: color,
          width: '2em',
          fontFamily,
          fontSize,
        }}
        value={rawFontSizeText}
        onChange={(event) => {
          setRawFontSizeText(event.target.value)
        }}
        onKeyDown={(event) => {
          if (event.code === 'Enter') {
            setRawFontSize(+rawFontSizeText)
          }
        }} />
        Color:&nbsp;
        <select style={{
          border: 'solid',
          borderWidth: '1px',
          borderColor: color,
          background: '#000000',
          color: color,
          fontFamily,
          fontSize,
        }}
        onChange={(event) => {
          const newColor = event.target.value;
          window.localStorage.setItem(COLOR_KEY, newColor);
          setColor(newColor);
        }}>
          {
          COLORS.map(hex => (<option style={{
              background: '#333333',
              border: 'solid',
              borderColor: color,
              borderWidth: '1px',
            }}>
              {hex}
            </option>))
          }
        </select>
        &nbsp;Language:&nbsp;
        <input style={{
          background: '#000000',
          borderWidth: '1px',
          borderColor: color,
          color: color,
          width: '2em',
          fontFamily,
          fontSize,
        }}
        value={languageText}
        onChange={(event) => {
          const newFont = event.target.value;
          window.localStorage.setItem(FONT_KEY, newFont);
          setLanguageText(newFont);
        }}
        onKeyDown={(event) => {
          if (event.code === 'Enter') {
            setLanguage(languageText)
          }
        }}/>
        &nbsp;Theme:&nbsp;
        <select style={{
          border: 'solid',
          borderWidth: '1px',
          borderColor: color,
          background: '#000000',
          color: color,
          fontFamily,
          fontSize,
        }}
        value={theme}
        onChange={(event) => {
          const newTheme = event.target.value;
          setTheme(newTheme);
          window.localStorage.setItem(THEME_KEY, newTheme);
          if (newTheme === 'light2') {
            setRetro(false);
          }
        }}>
          {
            ['light2', 'retro'].map(theme => (<option style={{
              background: '#333333',
              border: 'solid',
              borderColor: color,
              borderWidth: '1px',
            }}>
              {theme}
            </option>))
          }
        </select>
        &nbsp;Retro:&nbsp;
        <input type='checkbox'
               checked={retro}
               onChange={() => {
                 const newRetro = !retro;
                 window.localStorage.setItem(RETRO_KEY, '' + newRetro);
                 setRetro(newRetro);
               }}/>
        &nbsp;Fuzz:&nbsp;
        <input style={{
          background: '#000000',
          borderWidth: '1px',
          borderColor: color,
          color: color,
          width: '2em',
          fontFamily,
          fontSize,
        }}
        value={fuzz}
        onChange={(event) => {
          const newFuzz = event.target.value;
          window.localStorage.setItem(FUZZ_KEY, newFuzz);
          setFuzz(newFuzz);
        }}
        />
      </div>
      {component}
    </div>
  </div>;
}

function configureEditor(monaco: any) {
  monaco.languages.setLanguageConfiguration('yaml', {
    indentationRules: {
      increaseIndentPattern: /^[ ]*\. /,
    }
  });
}

function registerCompletionProvider(monaco: any) {
  monaco.languages.registerCompletionItemProvider('yaml', {
    provideCompletionItems: (model: any, position: any, token: any) => {
      const syntaxGroups = SYNTAX_GROUPS;

      // get information about the current line where the
      // autocomplete was activated
      let lineNum = position.lineNumber;
      const curLineInfo = getLineInfo(model.getLineContent(lineNum));

      // identify the starting name of the group where the autocomplete
      // was activated.  That is, consider the text:
      //
      // a:
      // b:
      // c: <- autocomplete activated here
      //
      // Then `startName` will be `a`
      let startName = curLineInfo.name;
      // The used sections are the sections in the current group that have
      // already been used.  In the example above, they are `a:`, `b:`, and `c:`.
      const usedSections: string[] = [];
      lineNum--;
      while (lineNum >= 1) {
        const info = getLineInfo(model.getLineContent(lineNum));
        if (info.indent < curLineInfo.indent || !info.name) {
          break;
        }
        startName = info.name;
        usedSections.unshift(startName);
        if (info.hasDot && info.indent === curLineInfo.indent) {
          break;
        }
        lineNum--;
      }

      // find the group with the given start name
      let targetGroup: string[] | undefined = undefined;
      for (const group of syntaxGroups) {
        if (group[0].replace(/:/, '').replace(/\?/g, '') === startName) {
          targetGroup = group;
          break;
        }
      }

      // if there is no group with the given start name, it could be because
      // the user activated autocomplete on the line where they were writing
      // the start name, and haven't yet completed typing it.  In this case,
      // return all starting names and let monaco filter out the ones that
      // match what the user has already typed.
      if (!targetGroup) {
        return {
          suggestions: syntaxGroups.map(sections => {
            const name = sections[0];
            return {
              label: name + '...',
              kind: monaco.languages.CompletionItemKind.Text,
              insertText: name,
            };
          }),
        };
      }

      // all available sections
      const availableSections = targetGroup.map(item => item.replace(/:/, '').replace(/\?/g, ''));
      let i = 0;
      let j = 0;

      // determine which sections have already been used
      while (i < availableSections.length && j < usedSections.length) {
        const used = usedSections[j++];
        while (i < availableSections.length && availableSections[i] !== used) {
          i++;
        }
      }

      // at this point availableSections[i+1:...] contains the sections not already
      // used, so suggest those section names

      const startCode = 'a'.charCodeAt(0);
      const suggestions = availableSections.slice(i+1).map((item, index) => {
        return {
          label: item + "...",
          kind: monaco.languages.CompletionItemKind.Text,
          insertText: item + ':',
          // sort converting index 0, 1, 2, ... to 'a', 'b', 'c', ...
          // to allow the correct sorting by index
          sortText: String.fromCharCode(startCode + index),
        };
      });

      if (suggestions.length === 0) {
        // this hack is needed to prevent monaco from showing suggestions
        // that just list any text already entered on the page
        suggestions.push({
          label: 'No suggestions',
          kind: monaco.languages.CompletionItemKind.Text,
          insertText: '',
          sortText: '',
        });
      }

      return {
        suggestions
      };
    }
  });
}

function getLineInfo(content: string): { hasDot: boolean; indent: number; name: string; } {
  let hasDot = false;
  let indent = 0;
  let name = '';

  let j = 0;
  while (j < content.length && (content[j] === ' ' || content[j] === '.')) {
    indent++;
    if (content[j] === '.') {
      hasDot = true;
    }
    j++;
  }

  while (j < content.length && content[j] !== ':') {
    name += content[j++];
  }

  return { hasDot, indent, name };
}

const DEFAULT_RAW_MATHLINGUA_SYNTAX = [
  "and:",
  "not:",
  "or:",
  "exists:\nwhere?:\nsuchThat?:",
  "existsUnique:\nwhere?:\nsuchThat?:",
  "forAll:\nwhere?:\nsuchThat?:\nthen:",
  "if:\nthen:",
  "iff:\nthen:",
  "generated:\nfrom:\nwhen?:",
  "piecewise:\nwhen?:\nthen?:\nelse?:",
  "matching:",
  "equality:\nbetween:\nprovided:",
  "member:\nmeans:",
  "membership:\naxiomatically:",
  "view:\nas:\nvia:\nby?:",
  "symbols:\nwhere:",
  "memberSymbols:\nwhere:",
  "symbols:\nas:",
  "memberSymbols:\nas:",
  "[]\nDefines:\nwith?:\ngiven?:\nwhen?:\nsuchThat?:\nextends?:\nsatisfying?:\nmeans?:\nexpressing?:\nusing?:\nProviding?:\nCodified:\nDescribed?:\nMetadata?:",
  "note:",
  "tag:",
  "reference:",
  "[]\nStates:\ngiven?:\nwhen?:\nsuchThat?:\nthat:\nusing?:\nCodified:\nDescribed?:\nMetadata?:",
  "writing:",
  "written:",
  "called:",
  "type:",
  "name:",
  "author:",
  "homepage:",
  "url:",
  "offset:",
  "[]\nResource:",
  "[]\nAxiom:\ngiven?:\nwhere?:\nsuchThat?:\nthen:\niff?:\nusing?:\nMetadata?:",
  "[]\nConjecture:\ngiven?:\nwhere?:\nsuchThat?:\nthen:\niff?:\nusing?:\nMetadata?:",
  "[]\nTheorem:\ngiven?:\nwhere?:\nsuchThat?:\nthen:\niff?:\nusing?:\nProof?:\nMetadata?:",
  "[]\nTopic:\ncontent:\nMetadata?:",
  "Note:\ncontent:\nMetadata?:",
  "Specify:",
  "zero:\nis:",
  "positiveInt:\nis:",
  "negativeInt:\nis:",
  "positiveFloat:\nis:",
  "negativeFloat:\nis:",
  "informally:\nas?:\nnote?:",
  "formally:\nas?:\nnote?:",
  "generally:\nas?:\nnote?:"
];

function darken(hexColor: string): string {
  let result = '#';
  for (const c of hexColor.replace(/#/, '')) {
    result += Math.max(parseInt(c, 16) - 4, 0).toString(16);
  }
  return result;
}

export const SYNTAX_GROUPS =
  DEFAULT_RAW_MATHLINGUA_SYNTAX.map(it => it.replace("[]\n", "").split("\n"));
