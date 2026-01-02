import { Plugin, WorkspaceLeaf, ItemView, MarkdownView, TFile } from 'obsidian';
import { createRoot, Root } from 'react-dom/client';
import * as React from 'react';
import { ReactView } from './ReactView';

const VIEW_TYPE_REACT = 'react-view';

class MyReactView extends ItemView {
  root: Root | null = null;
  currentContent: string | null = null;
  currentFile: TFile | null = null;

  constructor(leaf: WorkspaceLeaf) {
    super(leaf);
  }

  getViewType() {
    return VIEW_TYPE_REACT;
  }

  getDisplayText() {
    return 'Activity Player';
  }

  getIcon() {
    return 'rocket';
  }

  async onOpen() {
    const container = this.contentEl;
    container.empty();
    // Create a wrapper div for React
    const rootEl = container.createDiv();
    this.root = createRoot(rootEl);
    this.renderReact();
  }

  async onClose() {
    this.root?.unmount();
  }

  updateContent(content: string | null, file: TFile | null) {
    this.currentContent = content;
    this.currentFile = file;
    this.renderReact();
  }

  private renderReact() {
    this.root?.render(
      React.createElement(ReactView, {
        content: this.currentContent,
        fileName: this.currentFile?.basename || null,
        onActivityComplete: this.handleActivityComplete.bind(this),
        onReset: this.handleActivityReset.bind(this)
      })
    );
  }

  private async handleActivityComplete(lineIdx: number) {
    if (!this.currentFile || !this.currentContent) return;

    const lines = this.currentContent.split('\n');
    if (lineIdx < 0 || lineIdx >= lines.length) return;

    const line = lines?.[lineIdx] || '';
    // Replace [ ] with [x]
    // Regex matches: start of line, optional whitespace, dash or star, optional whitespace, [ ], optional whitespace
    const updatedLine = line.replace(/^(\s*[-*]\s*)\[\s*\]/, '$1[x]');

    if (line !== updatedLine) {
      lines[lineIdx] = updatedLine;
      const newContent = lines.join('\n');

      // Optimistic update
      this.currentContent = newContent;
      this.renderReact();

      try {
        await this.app.vault.modify(this.currentFile, newContent);
      } catch (e) {
        console.error("Failed to update activity completion", e);
      }
    }
  }

  private async handleActivityReset() {
    if (!this.currentFile || !this.currentContent) return;

    const lines = this.currentContent.split('\n');
    let hasChanges = false;

    // Regex for completed activity: start of line, optional whitespace, dash or star, optional whitespace, [x] or [X], optional whitespace
    const completedActivityRegex = /^(\s*[-*]\s*)\[[xX]\]/;

    const newLines = lines.map(line => {
      if (completedActivityRegex.test(line)) {
        hasChanges = true;
        return line.replace(completedActivityRegex, '$1[ ]');
      }
      return line;
    });

    if (hasChanges) {
      const newContent = newLines.join('\n');

      // Optimistic update
      this.currentContent = newContent;
      this.renderReact();

      try {
        await this.app.vault.modify(this.currentFile, newContent);
      } catch (e) {
        console.error("Failed to reset activities", e);
      }
    }
  }
}

export default class MyPlugin extends Plugin {
  async onload() {
    this.registerView(
      VIEW_TYPE_REACT,
      (leaf) => new MyReactView(leaf)
    );

    this.addRibbonIcon('rocket', 'Open React View', () => {
      this.activateView();
    });

    // Event listener for file switching
    this.registerEvent(
      this.app.workspace.on('active-leaf-change', async (leaf) => {
        if (leaf && leaf.view instanceof MarkdownView) {
          // New file is active
          if (leaf.view.file) {
            this.updateViewFromFile(leaf.view.file);
          }
        }
      })
    );

    // Event listener for content changes (Live Update)
    this.registerEvent(
      this.app.workspace.on('editor-change', async (editor, view) => {
        if (view instanceof MarkdownView) {
          const content = editor.getValue();
          this.updateViewWithContent(content, view.file);
        }
      })
    );
  }

  async updateViewFromFile(file: TFile) {
    try {
      const content = await this.app.vault.read(file);
      this.updateViewWithContent(content, file);
    } catch (e) {
      console.error("Failed to read file", e);
    }
  }

  updateViewWithContent(content: string, file: TFile | null) {
    const view = this.getReactView();
    if (view) {
      view.updateContent(content, file);
    }
  }

  getReactView(): MyReactView | null {
    const leaves = this.app.workspace.getLeavesOfType(VIEW_TYPE_REACT);
    // Safety check for empty array or undefined index access
    if (leaves && leaves.length > 0) {
      const leaf = leaves[0];
      if (leaf && leaf.view instanceof MyReactView) {
        return leaf.view;
      }
    }
    return null;
  }

  async activateView() {
    const { workspace } = this.app;
    let leaf: WorkspaceLeaf | null = null;
    const leaves = workspace.getLeavesOfType(VIEW_TYPE_REACT);

    if (leaves && leaves.length > 0) {
      const foundLeaf = leaves[0];
      if (foundLeaf) {
        leaf = foundLeaf;
      }
    } else {
      const rightLeaf = workspace.getRightLeaf(false);
      if (rightLeaf) {
        leaf = rightLeaf;
      } else {
        // Fallback
        leaf = workspace.getLeaf(true);
      }

      if (leaf) {
        await leaf.setViewState({ type: VIEW_TYPE_REACT, active: true });
      }
    }

    if (leaf) {
      workspace.revealLeaf(leaf);
    }

    // Initial fetch from active view
    const activeView = workspace.getActiveViewOfType(MarkdownView);
    if (activeView) {
      // Use editor value for most up to date content
      this.updateViewWithContent(activeView.editor.getValue(), activeView.file);
    }
  }

  onunload() {
  }
}
