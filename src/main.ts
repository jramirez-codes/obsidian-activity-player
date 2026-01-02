import { Plugin, WorkspaceLeaf, ItemView, MarkdownView, TFile } from 'obsidian';
import { createRoot, Root } from 'react-dom/client';
import * as React from 'react';
import { ReactView } from './ReactView';

const VIEW_TYPE_REACT = 'react-view';

class MyReactView extends ItemView {
  root: Root | null = null;
  currentContent: string | null = null;
  currentFileName: string | null = null;

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

  updateContent(content: string | null, fileName: string | null) {
    this.currentContent = content;
    this.currentFileName = fileName;
    this.renderReact();
  }

  private renderReact() {
    this.root?.render(
      React.createElement(ReactView, {
        content: this.currentContent,
        fileName: this.currentFileName
      })
    );
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
          this.updateViewWithContent(content, view.file?.basename || 'Untitled');
        }
      })
    );
  }

  async updateViewFromFile(file: TFile) {
    try {
      const content = await this.app.vault.read(file);
      this.updateViewWithContent(content, file.basename);
    } catch (e) {
      console.error("Failed to read file", e);
    }
  }

  updateViewWithContent(content: string, basename: string) {
    const view = this.getReactView();
    if (view) {
      view.updateContent(content, basename);
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
      this.updateViewWithContent(activeView.editor.getValue(), activeView.file?.basename || 'Untitled');
    }
  }

  onunload() {
  }
}
