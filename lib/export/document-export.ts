// 文档导出功能
// 支持 LaTeX、DOCX 和 PDF 格式

export type ExportFormat = 'latex' | 'docx' | 'pdf';

export interface ExportOptions {
  format: ExportFormat;
  projectTitle: string;
  abstract: string;
  keywords: string[];
  sections: {
    id: string;
    title: string;
    content: string[];
  }[];
  venueProfile: {
    id: string;
    name: string;
    shortName: string;
    template: string;
    publisher: string;
  };
}

export interface ExportResult {
  success: boolean;
  content?: string;
  blob?: Blob;
  filename?: string;
  error?: string;
}

// LaTeX 模板
const LATEX_TEMPLATE = `\\documentclass[conference]{IEEEtran}
\\usepackage[UTF8]{ctex}
\\usepackage{cite}
\\usepackage{amsmath}
\\usepackage{graphicx}
\\usepackage{url}

\\begin{document}

\\title{<%= title %>}

\\maketitle

\\begin{abstract}
<%= abstract %>
\\end{abstract}

\\begin{IEEEkeywords}
<%= keywords %>
\\end{IEEEkeywords}

<%= sections %>

\\end{document}`;

// 生成 LaTeX 文档
function generateLatex(options: ExportOptions): string {
  const sectionsContent = options.sections.map(section => {
    return `\\section{${section.title}}
${section.content.map(p => p.trim()).join('\n\n')}`;
  }).join('\n\n');

  return LATEX_TEMPLATE
    .replace('<%= title %>', options.projectTitle)
    .replace('<%= abstract %>', options.abstract)
    .replace('<%= keywords %>', options.keywords.join(', '))
    .replace('<%= sections %>', sectionsContent);
}

// 生成 DOCX 内容（HTML格式）
function generateDocx(options: ExportOptions): string {
  const sectionsContent = options.sections.map(section => {
    return `<h2>${section.title}</h2>
${section.content.map(p => `<p>${p}</p>`).join('\n')}`;
  }).join('\n\n');

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${options.projectTitle}</title>
  <style>
    body { font-family: 'Times New Roman', serif; line-height: 1.6; margin: 2cm; }
    h1 { text-align: center; font-size: 18pt; }
    h2 { font-size: 14pt; margin-top: 24pt; }
    .abstract { margin: 20px 0; font-style: italic; }
    .keywords { margin: 10px 0; }
  </style>
</head>
<body>
  <h1>${options.projectTitle}</h1>
  
  <div class="abstract">
    <strong>摘要：</strong>${options.abstract}
  </div>
  
  <div class="keywords">
    <strong>关键词：</strong>${options.keywords.join('、')}
  </div>
  
  ${sectionsContent}
</body>
</html>`;
}

// 生成 PDF 内容（使用 HTML + CSS）
function generatePdf(options: ExportOptions): string {
  // PDF 生成使用与 DOCX 类似的 HTML 格式，但样式更适合打印
  const sectionsContent = options.sections.map(section => {
    return `<h2>${section.title}</h2>
${section.content.map(p => `<p>${p}</p>`).join('\n')}`;
  }).join('\n\n');

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${options.projectTitle}</title>
  <style>
    @page { size: A4; margin: 2.5cm; }
    body { 
      font-family: 'Times New Roman', 'SimSun', serif; 
      line-height: 1.8; 
      font-size: 12pt;
      color: #000;
    }
    h1 { 
      text-align: center; 
      font-size: 16pt; 
      font-weight: bold;
      margin-bottom: 24pt;
    }
    h2 { 
      font-size: 14pt; 
      font-weight: bold;
      margin-top: 24pt;
      margin-bottom: 12pt;
    }
    .abstract { 
      margin: 20px 0; 
      text-align: justify;
    }
    .abstract-title {
      font-weight: bold;
      text-align: center;
      margin-bottom: 12pt;
    }
    .keywords { 
      margin: 10px 0; 
    }
    p {
      text-align: justify;
      text-indent: 2em;
      margin-bottom: 12pt;
    }
  </style>
</head>
<body>
  <h1>${options.projectTitle}</h1>
  
  <div class="abstract">
    <div class="abstract-title">摘 要</div>
    <p style="text-indent: 0;">${options.abstract}</p>
  </div>
  
  <div class="keywords">
    <strong>关键词：</strong>${options.keywords.join('、')}
  </div>
  
  ${sectionsContent}
</body>
</html>`;
}

// 导出文档主函数
export async function exportDocument(options: ExportOptions): Promise<ExportResult> {
  try {
    switch (options.format) {
      case 'latex': {
        const latexContent = generateLatex(options);
        return {
          success: true,
          content: latexContent,
          filename: `${options.projectTitle.replace(/[^a-zA-Z0-9\u4e00-\u9fa5]/g, '_')}.tex`,
          blob: new Blob([latexContent], { type: 'text/x-tex;charset=utf-8' })
        };
      }
      
      case 'docx': {
        const docxContent = generateDocx(options);
        return {
          success: true,
          content: docxContent,
          filename: `${options.projectTitle.replace(/[^a-zA-Z0-9\u4e00-\u9fa5]/g, '_')}.html`,
          blob: new Blob([docxContent], { type: 'text/html;charset=utf-8' })
        };
      }
      
      case 'pdf': {
        const pdfContent = generatePdf(options);
        return {
          success: true,
          content: pdfContent,
          filename: `${options.projectTitle.replace(/[^a-zA-Z0-9\u4e00-\u9fa5]/g, '_')}.html`,
          blob: new Blob([pdfContent], { type: 'text/html;charset=utf-8' })
        };
      }
      
      default:
        return {
          success: false,
          error: '不支持的导出格式'
        };
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : '导出失败'
    };
  }
}

// 下载文件辅助函数
export function downloadFile(blob: Blob, filename: string): void {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
}

// 批量导出功能
export async function batchExport(
  options: ExportOptions[], 
  format: ExportFormat
): Promise<ExportResult[]> {
  const results: ExportResult[] = [];
  
  for (const option of options) {
    const result = await exportDocument({ ...option, format });
    results.push(result);
  }
  
  return results;
}
