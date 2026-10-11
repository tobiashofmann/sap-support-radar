import { defineConfig } from 'vitepress'

// https://vitepress.dev/reference/site-config
export default defineConfig({
  title: "SAP Support Radar",
  description: "Check your SAP products' support status against the SAP Product Availability Matrix.",

  // Deployed to a project page (https://tobiashofmann.github.io/sap-support-radar/),
  // not a user/org root page - VitePress needs the base path to emit correct
  // asset URLs (/sap-support-radar/assets/... instead of /assets/...).
  base: '/sap-support-radar/',

  // /app/ (the deployed app build) and /reports/* (CI-generated quality
  // reports) are merged into the site at deploy time by the GitHub Pages
  // workflow - see ADR 0011 - and don't exist as pages VitePress itself
  // builds, so its dead-link checker can't (and shouldn't) resolve them.
  ignoreDeadLinks: [
    /^\/app\//,
    /^\/reports\//
  ],

  themeConfig: {
    // https://vitepress.dev/reference/default-theme-config
    nav: [
      { text: 'Home', link: '/' },
      { text: 'Why Support Radar?', link: '/why' },
      { text: 'Architecture', link: '/architecture' },
      { text: 'Workflow', link: '/workflow' },
      { text: 'ADRs', link: '/adr/' },
      { text: 'Classes & Methods', link: '/reference' },
      { text: 'Build Toolchain', link: '/build-toolchain' },
      { text: 'MCP Server', link: '/mcp-server' },
      { text: 'Reports', link: '/reports' }
    ],

    sidebar: [
      {
        text: 'Getting started',
        items: [
          { text: 'Overview & installation', link: '/' },
          { text: 'Why Support Radar?', link: '/why' }
        ]
      },
      {
        text: 'Architecture',
        items: [
          { text: 'Architecture overview', link: '/architecture' },
          { text: 'App workflow & pages', link: '/workflow' },
          { text: 'Classes & methods', link: '/reference' },
          { text: 'Build toolchain', link: '/build-toolchain' },
          { text: 'MCP server', link: '/mcp-server' },
          { text: 'Quality reports (deployed)', link: '/reports' }
        ]
      },
      {
        text: 'Architecture Decision Records',
        items: [
          { text: 'Overview', link: '/adr/' },
          {
            text: 'Foundational',
            items: [
              { text: '0001 – Client-only app, no backend', link: '/adr/0001-client-only-no-backend' },
              { text: '0002 – OpenUI5 as the framework', link: '/adr/0002-openui5-as-framework' },
              { text: '0003 – XML views', link: '/adr/0003-xml-views' },
              { text: '0004 – Standard controls only', link: '/adr/0004-standard-controls-only' },
              { text: '0005 – JSON models, no OData', link: '/adr/0005-json-models-no-odata' },
              { text: '0006 – User-supplied PAM data', link: '/adr/0006-user-supplied-pam-data' },
              { text: '0007 – MCP server', link: '/adr/0007-mcp-server' },
              { text: '0008 – TypeScript everywhere', link: '/adr/0008-typescript-everywhere' },
              { text: '0009 – UI tests as primary strategy', link: '/adr/0009-ui-tests-as-primary-strategy' },
              { text: '0010 – Quality toolchain', link: '/adr/0010-quality-toolchain' },
              { text: '0011 – GitHub Pages deployment', link: '/adr/0011-github-pages-deployment' }
            ]
          },
          {
            text: 'Implementation',
            items: [
              { text: '0012 – Index-based product detail route', link: '/adr/0012-index-based-product-detail-route' },
              { text: '0013 – Product identity key', link: '/adr/0013-product-identity-key' },
              { text: '0014 – Reactive control properties over class bindings', link: '/adr/0014-reactive-properties-over-class-binding' }
            ]
          }
        ]
      }
    ],

    socialLinks: [
      { icon: 'github', link: 'https://github.com/vuejs/vitepress' }
    ]
  }
})
