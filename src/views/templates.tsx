// Zalo Templates view

import { FC } from 'hono/jsx';
import { Layout, Card, Alert } from './layout';

interface Template {
  template_id: string;
  template_name: string;
  status: string;
  preview_url: string;
  template_quality: string;
  template_tag: string;
  created_time: string;
  updated_time: string;
}

interface TemplateDetail extends Template {
  approved_time?: string;
  params?: Array<{
    name: string;
    require: boolean;
    type: string;
    description?: string;
  }>;
  buttons?: Array<{
    type: string;
    title: string;
    payload?: string;
  }>;
}

interface TemplatesViewProps {
  templates?: Template[];
  selectedTemplate?: TemplateDetail | null;
  error?: string;
}

const getStatusColor = (status: string) => {
  switch (status.toLowerCase()) {
    case 'approved':
      return 'bg-green-100 text-green-800';
    case 'pending':
      return 'bg-yellow-100 text-yellow-800';
    case 'rejected':
      return 'bg-red-100 text-red-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

const getQualityColor = (quality: string) => {
  switch (quality.toLowerCase()) {
    case 'high':
      return 'text-green-600';
    case 'medium':
      return 'text-yellow-600';
    case 'low':
      return 'text-red-600';
    default:
      return 'text-gray-600';
  }
};

export const TemplatesView: FC<TemplatesViewProps> = (props) => {
  const { templates, selectedTemplate, error } = props;

  return (
    <Layout title="Zalo Templates" activePage="templates">
      <div class="px-4 sm:px-0">
        <h1 class="text-3xl font-bold text-gray-900 mb-2">Zalo Templates</h1>
        <p class="text-gray-600 mb-8">
          Browse and manage your Zalo message templates. Templates must be approved by Zalo before use.
        </p>

        {error && <Alert type="error" message={error} />}

        <div class="space-y-6">
          {/* Refresh Button */}
          <div class="flex justify-between items-center">
            <button
              type="button"
              hx-get="/admin/templates"
              hx-target="#templates-container"
              hx-swap="innerHTML"
              class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium"
            >
              Refresh Templates
            </button>
            <span class="text-sm text-gray-500">
              Shows up to 100 templates
            </span>
          </div>

          <div id="templates-container">
            {!templates ? (
              <Card>
                <div class="text-center py-8">
                  <p class="text-gray-500">Click "Refresh Templates" to load your Zalo templates.</p>
                </div>
              </Card>
            ) : templates.length === 0 ? (
              <Card>
                <div class="text-center py-8 text-gray-500">
                  <p>No templates found.</p>
                  <p class="text-sm mt-2">
                    Create templates in the Zalo Business Dashboard.
                  </p>
                </div>
              </Card>
            ) : (
              <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Templates List */}
                <Card title={`Templates (${templates.length})`}>
                  <div class="space-y-3 max-h-[600px] overflow-y-auto">
                    {templates.map((template) => (
                      <div
                        key={template.template_id}
                        class={`p-4 border rounded-lg cursor-pointer transition ${
                          selectedTemplate?.template_id === template.template_id
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                        hx-get={`/admin/templates/${template.template_id}`}
                        hx-target="#template-detail"
                        hx-swap="innerHTML"
                      >
                        <div class="flex justify-between items-start mb-2">
                          <h3 class="font-medium text-gray-900">{template.template_name}</h3>
                          <span
                            class={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getStatusColor(
                              template.status
                            )}`}
                          >
                            {template.status}
                          </span>
                        </div>
                        <p class="text-xs text-gray-500 mb-2">ID: {template.template_id}</p>
                        <div class="flex items-center justify-between text-sm">
                          <span class={`font-medium ${getQualityColor(template.template_quality)}`}>
                            {template.template_quality} quality
                          </span>
                          <span class="text-gray-500">{template.template_tag}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>

                {/* Template Detail */}
                <div id="template-detail">
                  {selectedTemplate ? (
                    <TemplateDetailView template={selectedTemplate} />
                  ) : (
                    <Card title="Template Details">
                      <div class="text-center py-8 text-gray-500">
                        <p>Select a template to view details</p>
                      </div>
                    </Card>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
};

const TemplateDetailView: FC<{ template: TemplateDetail }> = ({ template }) => {
  return (
    <Card title={template.template_name}>
      <div class="space-y-4">
        {/* Basic Info */}
        <div class="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p class="text-gray-500">Template ID</p>
            <p class="font-mono">{template.template_id}</p>
          </div>
          <div>
            <p class="text-gray-500">Status</p>
            <span
              class={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getStatusColor(
                template.status
              )}`}
            >
              {template.status}
            </span>
          </div>
          <div>
            <p class="text-gray-500">Quality</p>
            <span class={`font-medium ${getQualityColor(template.template_quality)}`}>
              {template.template_quality}
            </span>
          </div>
          <div>
            <p class="text-gray-500">Tag</p>
            <p>{template.template_tag}</p>
          </div>
        </div>

        {/* Preview Link */}
        {template.preview_url && (
          <div>
            <p class="text-gray-500 text-sm mb-1">Preview</p>
            <a
              href={template.preview_url}
              target="_blank"
              rel="noopener noreferrer"
              class="text-blue-600 hover:text-blue-800 text-sm"
            >
              View Template Preview →
            </a>
          </div>
        )}

        {/* Parameters */}
        {template.params && template.params.length > 0 && (
          <div>
            <h4 class="font-medium text-gray-900 mb-2">Parameters ({template.params.length})</h4>
            <div class="space-y-2">
              {template.params.map((param, idx) => (
                <div
                  key={idx}
                  class="p-3 bg-gray-50 rounded-lg text-sm"
                >
                  <div class="flex justify-between items-start">
                    <span class="font-medium">{param.name}</span>
                    {param.require && (
                      <span class="text-xs text-red-600 font-medium">Required</span>
                    )}
                  </div>
                  <p class="text-gray-500 text-xs mt-1">Type: {param.type}</p>
                  {param.description && (
                    <p class="text-gray-600 text-xs mt-1">{param.description}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Buttons */}
        {template.buttons && template.buttons.length > 0 && (
          <div>
            <h4 class="font-medium text-gray-900 mb-2">Buttons ({template.buttons.length})</h4>
            <div class="space-y-2">
              {template.buttons.map((btn, idx) => (
                <div
                  key={idx}
                  class="p-3 bg-gray-50 rounded-lg text-sm"
                >
                  <p class="font-medium">{btn.title}</p>
                  <p class="text-gray-500 text-xs">Type: {btn.type}</p>
                  {btn.payload && (
                    <p class="text-gray-600 text-xs font-mono mt-1">{btn.payload}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Copy Template ID */}
        <div class="pt-4 border-t">
          <button
            type="button"
            onclick={`navigator.clipboard.writeText('${template.template_id}')`}
            class="w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition text-sm font-medium"
          >
            Copy Template ID
          </button>
        </div>
      </div>
    </Card>
  );
};

export default TemplatesView;
