/** @type {import('next').NextConfig} */
module.exports = {
  webpack: (config) => {
    config.resolve.alias.canvas = false;
    config.resolve.alias.encoding = false;
    return config;
  },
};
