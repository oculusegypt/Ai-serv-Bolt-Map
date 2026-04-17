const React = require('react');
const { View, Text } = require('react-native');

const MapView = React.forwardRef(function MapView({ style, children }, ref) {
  return React.createElement(
    View,
    { style: [{ backgroundColor: '#e8eaed', alignItems: 'center', justifyContent: 'center' }, style], ref },
    React.createElement(Text, { style: { color: '#666', fontSize: 14 } }, '🗺️ Map not available on web'),
    children
  );
});

const Marker = function Marker({ children }) {
  return children || null;
};

const Callout = function Callout({ children }) {
  return children || null;
};

const Circle = function Circle() { return null; };
const Polygon = function Polygon() { return null; };
const Polyline = function Polyline() { return null; };
const Overlay = function Overlay() { return null; };
const Heatmap = function Heatmap() { return null; };
const UrlTile = function UrlTile() { return null; };

const PROVIDER_GOOGLE = 'google';
const PROVIDER_DEFAULT = null;

MapView.Animated = MapView;

module.exports = MapView;
module.exports.default = MapView;
module.exports.Marker = Marker;
module.exports.Callout = Callout;
module.exports.Circle = Circle;
module.exports.Polygon = Polygon;
module.exports.Polyline = Polyline;
module.exports.Overlay = Overlay;
module.exports.Heatmap = Heatmap;
module.exports.UrlTile = UrlTile;
module.exports.PROVIDER_GOOGLE = PROVIDER_GOOGLE;
module.exports.PROVIDER_DEFAULT = PROVIDER_DEFAULT;
module.exports.MapView = MapView;
module.exports.AnimatedRegion = class AnimatedRegion {
  constructor() {}
  stopAnimation() {}
  timing() { return { start: () => {} }; }
};
