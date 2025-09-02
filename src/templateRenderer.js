import { readFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TEMPLATES_DIR = path.join(__dirname, 'templates');

/**
 * Simple template renderer that loads HTML files and performs basic variable substitution
 * @param {string} templateName - Name of the template file (without .html extension)
 * @param {Object} variables - Object containing variables to substitute in the template
 * @returns {string} Rendered HTML string
 */
export function renderTemplate(templateName, variables = {}) {
  const templatePath = path.join(TEMPLATES_DIR, `${templateName}.html`);
  
  try {
    let html = readFileSync(templatePath, 'utf-8');
    
    // Simple variable substitution using {{variableName}} syntax
    for (const [key, value] of Object.entries(variables)) {
      const placeholder = `{{${key}}}`;
      html = html.replace(new RegExp(placeholder, 'g'), value || '');
    }
    
    return html;
  } catch (error) {
    console.error(`Error rendering template ${templateName}:`, error);
    throw new Error(`Failed to render template: ${templateName}`);
  }
}