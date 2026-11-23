/** A point in the service scene. */
export type Point = { x: number; y: number };
/** A circular participant part. */
export type Circle = Point & { radius: number };
/** Data for Pose. */
export type PoseBounds = {
  left: number;
  top: number;
  right: number;
  bottom: number;
};
/** The participant geometry observed at one frame. */
export type Pose = {
  head: Circle;
  rear: Circle;
  front: Circle;
  hand: Circle;
  coordinates: number[];
  armEndpoint: Point;
  bounds: PoseBounds;
};
