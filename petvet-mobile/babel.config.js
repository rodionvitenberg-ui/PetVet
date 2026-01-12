module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      ["babel-preset-expo", { jsxImportSource: "nativewind" }],
      "nativewind/babel",
    ],
    plugins: [
      // ОБЯЗАТЕЛЬНО: этот плагин должен быть последним в списке!
      "react-native-reanimated/plugin", 
    ],
  };
};