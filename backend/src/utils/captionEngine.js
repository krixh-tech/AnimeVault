/**
 * AnimaVault Caption Template Engine
 * Supports {variables} and [formatting tags]
 */

const FORMATTING_TAGS = {
  '[B]': '<b>',  '[/B]': '</b>',
  '[T]': '<i>',  '[/T]': '</i>',
  '[U]': '<u>',  '[/U]': '</u>',
  '[SP]': '<span class="spoiler">',  '[/SP]': '</span>',
  '[CODE]': '<code>', '[/CODE]': '</code>',
};

const TELEGRAM_FORMATTING = {
  '[B]': '*',   '[/B]': '*',
  '[T]': '_',   '[/T]': '_',
  '[U]': '',    '[/U]': '',
  '[SP]': '||', '[/SP]': '||',
  '[CODE]': '`', '[/CODE]': '`',
};

/**
 * Render a caption template with variables
 * @param {string} template - Template string with {vars} and [tags]
 * @param {object} data - Variable values
 * @param {string} format - 'html' | 'markdown' | 'telegram' | 'plain'
 */
function renderCaption(template, data = {}, format = 'html') {
  if (!template) return '';

  let result = template;

  // 1. Replace variables
  const variables = {
    '{filename}': data.filename || '',
    '{episode}': data.episode !== undefined ? String(data.episode).padStart(2, '0') : '',
    '{quality}': data.quality || '',
    '{language}': data.language || 'SUB',
    '{size}': data.size || '',
    '{title}': data.title || data.filename || '',
    '{anime}': data.anime || data.title || '',
    '{studio}': data.studio || '',
    '{year}': data.year || new Date().getFullYear(),
    '{date}': new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }),
    '{time}': new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
  };

  for (const [key, value] of Object.entries(variables)) {
    result = result.replaceAll(key, value);
  }

  // 2. Apply formatting based on output format
  const tagMap = format === 'telegram' ? TELEGRAM_FORMATTING : FORMATTING_TAGS;

  for (const [tag, replacement] of Object.entries(tagMap)) {
    result = result.replaceAll(tag, replacement);
  }

  // 3. Plain text - strip all tags
  if (format === 'plain') {
    result = result.replace(/<[^>]+>/g, '').replace(/[*_|`]/g, '');
  }

  // 4. Handle line breaks
  result = result.replace(/\\n/g, '\n');

  return result.trim();
}

/**
 * Parse template to extract used variables
 */
function parseTemplate(template) {
  const vars = (template.match(/\{(\w+)\}/g) || []).map(v => v.slice(1, -1));
  const tags = (template.match(/\[\/?\w+\]/g) || []);
  return { variables: [...new Set(vars)], tags: [...new Set(tags)] };
}

/**
 * Validate template syntax
 */
function validateTemplate(template) {
  const errors = [];
  const openTags = template.match(/\[(?!\/)\w+\]/g) || [];
  const closeTags = template.match(/\[\/\w+\]/g) || [];

  // Check balanced tags
  for (const tag of openTags) {
    const closeTag = tag.replace('[', '[/');
    if (!closeTags.includes(closeTag)) {
      errors.push(`Unclosed tag: ${tag}`);
    }
  }

  // Check valid variables
  const validVars = ['filename', 'episode', 'quality', 'language', 'size', 'title', 'anime', 'studio', 'year', 'date', 'time'];
  const usedVars = (template.match(/\{(\w+)\}/g) || []).map(v => v.slice(1, -1));
  for (const v of usedVars) {
    if (!validVars.includes(v)) errors.push(`Unknown variable: {${v}}`);
  }

  return { valid: errors.length === 0, errors };
}

// Default templates
const DEFAULT_TEMPLATES = {
  standard: '[B]🎬 {anime}[/B]\n📺 Episode {episode}\n🎯 Quality: {quality}\n📦 Size: {size}',
  minimal: '{anime} - Ep {episode} [{quality}]',
  telegram: '[B]{anime}[/B]\n[T]Episode {episode}[/T]\n{quality} | {language} | {size}',
  detailed: '[B]🎌 {anime}[/B]\n\n📺 Episode: {episode}\n🎯 Quality: {quality}\n🗣️ Language: {language}\n📦 Size: {size}\n📅 {date}',
};

module.exports = { renderCaption, parseTemplate, validateTemplate, DEFAULT_TEMPLATES };
