import type { LLMProvider } from './llm-provider';

/**
 * ConfigAgent helps tenants configure their Veska ERP setup.
 * Given a description of their business, it recommends settings.
 */
export class ConfigAgent {
  constructor(private llm: LLMProvider) {}

  async suggestConfig(businessDescription: string): Promise<{
    suggestedModules: string[];
    suggestedRoles: string[];
    tips: string[];
  }> {
    const prompt = `Given this business description: "${businessDescription}"

Recommend:
1. Which Veska ERP modules they should enable (from: HR, Finance, Inventory, Sales, Projects, CRM, Purchasing, Time Tracking)
2. Which user roles they need (from: Admin, Manager, Finance, HR, Sales, Viewer)
3. Top 3 setup tips specific to their business

Respond in JSON format: { "suggestedModules": [], "suggestedRoles": [], "tips": [] }`;

    const response = await this.llm.chat([{ role: 'user', content: prompt }]);

    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) return JSON.parse(jsonMatch[0]);
    } catch { /* fall through */ }

    return { suggestedModules: [], suggestedRoles: [], tips: [response] };
  }
}
