import { Language, tourStops } from "./data";

type CampusMapProps = {
  stopIndex: number;
  expanded?: boolean;
  variant?: "overview" | "tour";
  language?: Language;
};

type BuildingKey = "yeji" | "uihaeng" | "wooam" | "yunghap" | "changui";
type Point = [number, number];

type BuildingSpec = {
  points: Point[];
  floors: number;
  floorHeight: number;
  visibleEdges: number[];
};

const buildings: Record<BuildingKey, BuildingSpec> = {
  wooam: {
    // A single rotated rectangular block on the shared campus projection grid.
    points: [[5, 300], [205, 288], [270, 321], [70, 333]],
    floors: 3,
    floorHeight: 32,
    visibleEdges: [1, 2, 3],
  },
  yeji: {
    points: [[286, 340], [704, 316], [776, 351], [357, 377]],
    floors: 5,
    floorHeight: 28,
    visibleEdges: [1, 2, 3],
  },
  uihaeng: {
    // Same dimensions as Yeji-Gwan, offset behind it and occluded by render order.
    points: [[341, 324], [759, 300], [831, 335], [412, 361]],
    floors: 5,
    floorHeight: 28,
    visibleEdges: [1, 2, 3],
  },
  yunghap: {
    // Faces the same direction as Yeji-Gwan and Chang-ui In-jae Gwan.
    points: [[810, 341], [910, 335], [975, 368], [875, 374]],
    floors: 5,
    floorHeight: 28,
    visibleEdges: [1, 2, 3],
  },
  changui: {
    // Lower-right block from the reference map.
    points: [[805, 475], [970, 463], [1035, 497], [870, 510]],
    floors: 4,
    floorHeight: 27,
    visibleEdges: [1, 2, 3],
  },
};

const buildingNames: Record<BuildingKey, [string, string]> = {
  yeji: ["예지관", "YEJI-GWAN"],
  uihaeng: ["의행관", "UIHAENG-GWAN"],
  wooam: ["우암관", "WOOAM-GWAN"],
  yunghap: ["융합인재관", "YUNG-HAP"],
  changui: ["창의인재관", "CHANG-UI"],
};

// Yeji-Gwan 1F follows the real left-to-right order:
// Wind Tunnel & Maker Space (-4), History Hall (-1), Great Hall (+3).
const stopPoints: Point[] = [
  [650, 345],
  [510, 354],
  [395, 362],
  [535, 204],
  [655, 261],
  [455, 301],
  [650, 317],
  [900, 322],
  [902, 351],
  [950, 455],
  [920, 490],
  [650, 345],
];

// One segment per arrival. All vertical movement in Yeji-Gwan uses the same
// central stair core; the route branches from that core only on each floor.
const routeSegments: Point[][] = [
  [[650, 345]],
  [[650, 345], [510, 354]],
  [[510, 354], [395, 362]],
  [[395, 362], [565, 351], [565, 210], [535, 204]],
  [[535, 204], [565, 210], [565, 266], [655, 261]],
  [[655, 261], [565, 266], [565, 294], [455, 301]],
  [[455, 301], [565, 294], [565, 322], [650, 317]],
  [[650, 317], [704, 318], [760, 318], [820, 318], [860, 320], [900, 322]],
  [[900, 322], [901, 336], [902, 351]],
  [[902, 351], [906, 392], [920, 430], [950, 455]],
  [[950, 455], [935, 475], [920, 490]],
  [[920, 490], [850, 500], [805, 470], [785, 420], [785, 382], [748, 364], [704, 356], [650, 345]],
];

const stopFloors = [1, 1, 1, 6, 4, 3, 2, 2, 1, 2, 1, 1];

function pointsValue(points: Point[]) {
  return points.map(([x, y]) => `${x},${y}`).join(" ");
}

function shift(points: Point[], dy: number) {
  return points.map(([x, y]) => [x, y + dy] as Point);
}

function buildingForStop(index: number): BuildingKey {
  const building = tourStops[index].building[1];
  if (building === "Yung-hap In-jae Gwan") return "yunghap";
  if (building === "Chang-ui In-jae Gwan") return "changui";
  return "yeji";
}

function tourViewBox(building: BuildingKey, stopIndex: number) {
  if (stopIndex === tourStops.length - 1) return "0 130 1060 410";
  if (stopIndex === 7 || stopIndex === 8) return "560 125 520 300";
  if (building === "yunghap") return "680 160 350 285";
  if (building === "changui") return "760 340 310 205";
  return "245 145 565 255";
}

function FloorTags({ x, baseY, floors, height }: { x: number; baseY: number; floors: number; height: number }) {
  return (
    <g className="map-floor-tags" aria-hidden="true">
      {Array.from({ length: floors }, (_, index) => (
        <text key={index} x={x} y={baseY - index * height}>{index + 1}F</text>
      ))}
    </g>
  );
}

function StackedBuilding({ name, active, activeFloor, transform, children }: { name: BuildingKey; active: boolean; activeFloor?: number; transform?: string; children?: React.ReactNode }) {
  const spec = buildings[name];
  const top = shift(spec.points, -spec.floors * spec.floorHeight);

  return (
    <g className={`blueprint-building ${name}-building ${active ? "map-active-building" : ""}`} transform={transform}>
      {Array.from({ length: spec.floors }, (_, floor) => {
        const bottom = shift(spec.points, -floor * spec.floorHeight);
        const upper = shift(spec.points, -(floor + 1) * spec.floorHeight);
        return (
          <g key={`${name}-floor-${floor + 1}`} className={`map-floor ${active && activeFloor === floor + 1 ? "map-active-floor" : ""}`}>
            {spec.visibleEdges.map((edgeIndex) => {
              const nextIndex = (edgeIndex + 1) % spec.points.length;
              const isOpenBottomRightWall = spec.points.length === 4 && edgeIndex === 1;
              const face = [upper[edgeIndex], upper[nextIndex], bottom[nextIndex], bottom[edgeIndex]] as Point[];
              return (
                <g key={`${name}-${floor}-${edgeIndex}`}>
                  <polygon
                    className={`map-floor-wall map-floor-wall-${floor % 2} map-wall-edge-${edgeIndex} ${isOpenBottomRightWall ? "map-wall-open-bottom" : ""}`}
                    points={pointsValue(face)}
                  />
                  {isOpenBottomRightWall && (
                    <path
                      className={`map-floor-outline ${active && activeFloor === floor + 1 ? "map-active-floor-outline" : ""}`}
                      d={`M${face[0][0]} ${face[0][1]}L${face[1][0]} ${face[1][1]}M${face[0][0]} ${face[0][1]}L${face[3][0]} ${face[3][1]}M${face[1][0]} ${face[1][1]}L${face[2][0]} ${face[2][1]}`}
                    />
                  )}
                </g>
              );
            })}
          </g>
        );
      })}
      <g className="map-building-foundation" aria-hidden="true">
        {spec.visibleEdges.filter((edgeIndex) => !(spec.points.length === 4 && edgeIndex === 1)).map((edgeIndex) => {
          const nextIndex = (edgeIndex + 1) % spec.points.length;
          return <line key={`${name}-base-${edgeIndex}`} x1={spec.points[edgeIndex][0]} y1={spec.points[edgeIndex][1]} x2={spec.points[nextIndex][0]} y2={spec.points[nextIndex][1]} />;
        })}
      </g>
      <polygon className={`map-building-roof ${active && activeFloor && activeFloor > spec.floors ? "map-active-roof" : ""}`} points={pointsValue(top)} />
      {children}
    </g>
  );
}

function Route({ stopIndex }: { stopIndex: number }) {
  if (stopIndex === 0) return null;
  return (
    <g className="map-route" aria-hidden="true">
      {routeSegments.slice(1, stopIndex).map((segment, index) => (
        <polyline key={`past-${index}`} className="map-route-past" points={pointsValue(segment)} />
      ))}
      <polyline className="map-route-current" points={pointsValue(routeSegments[stopIndex])} />
    </g>
  );
}

export default function CampusMap({ stopIndex, expanded = false, variant = "tour", language = "ko" }: CampusMapProps) {
  const stop = tourStops[stopIndex];
  const activeBuilding = buildingForStop(stopIndex);
  const activeFloor = stopFloors[stopIndex];
  const langIndex = language === "ko" ? 0 : 1;
  const currentPoint = stopPoints[stopIndex];
  const viewBox = variant === "overview" ? "0 160 1060 370" : tourViewBox(activeBuilding, stopIndex);
  const instanceId = `${variant}-${stop.id}-${expanded ? "expanded" : "inline"}`;
  const titleId = `map-title-${instanceId}`;
  const descId = `map-desc-${instanceId}`;

  return (
    <div className={`campus-map-shell ${variant}-map ${expanded ? "map-expanded" : ""}`}>
      <svg className="campus-map" viewBox={viewBox} preserveAspectRatio="xMidYMid meet" role="img" aria-labelledby={`${titleId} ${descId}`}>
        <title id={titleId}>{variant === "overview" ? "SSHS campus overview" : `Tour detail map — ${stop.name[1]}`}</title>
        <desc id={descId}>A simplified layered campus diagram rebuilt from the reference map: Wooam is left, Yeji is central, Yung-hap is upper-right, and Chang-ui is lower-right.</desc>
        <defs>
          <filter id={`map-shadow-${instanceId}`} x="-20%" y="-20%" width="150%" height="170%">
            <feDropShadow dx="0" dy="7" stdDeviation="6" floodColor="#071640" floodOpacity=".10" />
          </filter>
        </defs>

        <g filter={`url(#map-shadow-${instanceId})`}>
          <StackedBuilding name="uihaeng" active={false} transform="translate(-18 -9)">
            <text x="675" y="174" className="map-building-label">{buildingNames.uihaeng[langIndex]}</text>
          </StackedBuilding>

          <StackedBuilding name="wooam" active={activeBuilding === "wooam"} transform="translate(0 -8)">
            <text x="50" y="225" className="map-building-label">{buildingNames.wooam[langIndex]}</text>
          </StackedBuilding>

          <g className="map-bridge" aria-label={language === "ko" ? "우암관 1층과 예지관 2층 가교" : "Wooam 1F to Yeji 2F bridge"}>
            <polygon className="map-bridge-side" points="270,308 286,309 286,319 270,318" />
            <polygon className="map-bridge-roof" points="270,299 286,300 286,309 270,308" />
          </g>

          <StackedBuilding name="yeji" active={activeBuilding === "yeji"} activeFloor={activeBuilding === "yeji" ? activeFloor : undefined}>
            <g className="map-central-stair-core" aria-label={language === "ko" ? "예지관 중앙 계단" : "Yeji-Gwan central stairs"}>
              <polygon points="545,365 585,363 585,207 545,209" />
              {[337, 309, 281, 253, 225].map((y) => <line key={y} x1="545" y1={y} x2="585" y2={y - 2} />)}
            </g>
            <g className="map-observatory" aria-hidden="true">
              <polygon className="map-rooftop-base" points="500,205 579,200 600,210 521,216" />
              <ellipse cx="525" cy="198" rx="20" ry="10" />
              <path d="M505 198A20 17 0 01545 198" />
              <ellipse cx="566" cy="196" rx="18" ry="9" />
              <path d="M548 196A18 15 0 01584 196" />
            </g>
            <text x="626" y="205" className="map-building-label">{buildingNames.yeji[langIndex]}</text>
            <text x="365" y="371" className="map-room-label">{language === "ko" ? "풍동실·창작실" : "WIND · MAKER"}</text>
            <text x="486" y="363" className="map-room-label">{language === "ko" ? "역사관" : "HISTORY"}</text>
            <text x="625" y="354" className="map-room-label">{language === "ko" ? "대회의실" : "GREAT HALL"}</text>
            <FloorTags x={742} baseY={337} floors={5} height={28} />
          </StackedBuilding>

          <g className="map-bridge" aria-label={language === "ko" ? "2층 가교" : "Second-floor bridge"}>
            <polygon className="map-bridge-side" points="776,318 810,318 810,329 776,329" />
            <polygon className="map-bridge-roof" points="776,309 810,309 810,318 776,318" />
            <text x="790" y="304" className="map-bridge-label">2F</text>
          </g>

          <StackedBuilding name="yunghap" active={activeBuilding === "yunghap"} activeFloor={activeBuilding === "yunghap" ? activeFloor : undefined}>
            <text x="844" y="210" className="map-building-label">{buildingNames.yunghap[langIndex]}</text>
            <FloorTags x={950} baseY={361} floors={5} height={28} />
          </StackedBuilding>

          <StackedBuilding name="changui" active={activeBuilding === "changui"} activeFloor={activeBuilding === "changui" ? activeFloor : undefined}>
            <text x="846" y="370" className="map-building-label">{buildingNames.changui[langIndex]}</text>
            <FloorTags x={1005} baseY={485} floors={4} height={27} />
          </StackedBuilding>
        </g>

        <Route stopIndex={stopIndex} />
        {stopIndex > 0 && <g className="map-start-marker" transform={`translate(${stopPoints[0][0]} ${stopPoints[0][1]})`}><circle r="6" /><circle r="2" /></g>}
        <g className="current-marker" transform={`translate(${currentPoint[0]} ${currentPoint[1]})`}>
          <circle className="current-halo" r="17" /><circle className="current-ring" r="10" /><circle className="current-core" r="3.5" />
        </g>
      </svg>
      <div className="map-caption">
        <span><i className="legend-dot" />{variant === "overview" ? (language === "ko" ? "전체 캠퍼스" : "Campus overview") : stop.name[langIndex]}</span>
        <span>{language === "ko" ? "방문객용 개략도 · 실제 축척과 다름" : "Visitor diagram · Not to scale"}</span>
      </div>
    </div>
  );
}
