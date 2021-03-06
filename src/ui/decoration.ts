/**
 * Helps to manage decorations for the TOML files.
 */
import {
  window,
  DecorationOptions,
  Range,
  TextEditor,
  MarkdownString,
} from "vscode";

import { checkVersion } from "../semver/semverUtils";
import Item from "../core/Item";
import { status, ReplaceItem } from "../toml/commands";
import { validRange } from "semver";

export const latestVersion = (text: string) =>
  window.createTextEditorDecorationType({
    after: {
      margin: "2em",
    },
  });

/**
 * Create a decoration for the given crate.
 * @param editor
 * @param crate
 * @param version
 * @param versions
 */
export default function decoration(
  editor: TextEditor,
  item: Item,
  versions: string[],
  compatibleDecorator: string,
  incompatibleDecorator: string,
  errorDecorator: string,
  error?: string,
): DecorationOptions {
  // Also handle json valued dependencies

  const start = item.start;
  const endofline = editor.document.lineAt(editor.document.positionAt(item.end)).range.end;
  const decoPosition = editor.document.offsetAt(endofline);
  const end = item.end;
  const [satisfies, maxSatisfying] = checkVersion(item.value, versions);

  const hoverMessage = error ? new MarkdownString(`**${error}**`) : new MarkdownString(`#### Versions`);
  hoverMessage.appendMarkdown(` _( [Check Reviews](https://web.crev.dev/rust-reviews/crate/${item.key.replace(/"/g, "")}) )_`);
  hoverMessage.isTrusted = true;

  if (versions.length > 0) {
    status.replaceItems.push({
      item: `"${versions[0]}"`,
      start,
      end,
    });
  }

  for (let i = 0; i < versions.length; i++) {
    const version = versions[i];
    const replaceData: ReplaceItem = {
      item: `"${version}"`,
      start,
      end,
    };
    const isCurrent = version === maxSatisfying;
    const encoded = encodeURI(JSON.stringify(replaceData));
    const docs = (i === 0 || isCurrent) ? `[(docs)](https://docs.rs/crate/${item.key}/${version})` : "";
    const command = `${isCurrent ? "**" : ""}[${version}](command:crates.replaceVersion?${encoded})${docs}${isCurrent ? "**" : ""}`;
    hoverMessage.appendMarkdown("\n * ");
    hoverMessage.appendMarkdown(command);
  }

  let latestText = compatibleDecorator.replace("${version}", "");
  if (!validRange(item.value))
    latestText = errorDecorator.replace("${version}", versions[0]);
  else if (versions[0] !== maxSatisfying)
    if (satisfies) {
      latestText = compatibleDecorator.replace("${version}", versions[0]);
    } else {
      latestText = incompatibleDecorator.replace("${version}", versions[0]);
    }
  const contentText = error ? errorDecorator : latestText;

  const deco = {
    range: new Range(
      editor.document.positionAt(start),
      editor.document.positionAt(decoPosition),
    ),
    hoverMessage,
    renderOptions: {
      after: {},
    },
  };
  if (contentText.length > 0) {
    deco.renderOptions.after = { contentText };
  }
  return deco;
}
