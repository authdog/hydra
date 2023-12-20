const withNextra = require('nextra')({
  theme: 'nextra-theme-docs',
  themeConfig: './theme.config.tsx'
})

module.exports = withNextra({
  images: {
    unoptimized: true,
  },
  i18n: {
    locales: ["en"],
    defaultLocale: "en"
  }
})