import {
  Box,
  BoxProps,
  Loader,
  NavLinkProps,
  Title,
  useMantineTheme,
} from "@mantine/core";
import { useMemo } from "react";
import { APP_CONFIG } from "@/config/AppConfig";
import { NavLinkList } from "@/lib/ui/links/NavLinkList";
import { makeBucketMapFromList } from "@/lib/utils/maps/builders";
import { getProp, propEquals } from "@/lib/utils/objects/higherOrderFuncs";
import { EntityConfigClient } from "@/models/EntityConfig/EntityConfigClient";
import { LocalDataset } from "@/models/LocalDataset/types";
import { getDatasetLinkProps } from "@/models/LocalDataset/utils";

type Props = {
  datasets: LocalDataset[];
  isLoading: boolean;
} & BoxProps;

function makeDatasetLink(
  dataset: LocalDataset,
  options: {
    style: NavLinkProps["style"];
    label?: string;
  },
): NavLinkProps & { linkKey: string } {
  return {
    ...getDatasetLinkProps(dataset.id),
    label: options.label ?? dataset.name,
    style: options.style,
    linkKey: dataset.id,
  };
}

export function DatasetNavbar({
  datasets,
  isLoading,
  ...boxProps
}: Props): JSX.Element {
  const theme = useMantineTheme();
  const borderStyle = useMemo(() => {
    return {
      borderTopRightRadius: theme.radius.md,
      borderBottomRightRadius: theme.radius.md,
    };
  }, [theme.radius]);

  const [entityConfigs, isLoadingEntityConfigs] = EntityConfigClient.useGetAll({
    useQueryOptions: {
      enabled: datasets.some(propEquals("datasetType", "entities_queryable")),
    },
  });

  const [uploadedDatasetLinks, entityDatasetLinks] = useMemo(() => {
    const datasetsByType = makeBucketMapFromList(datasets, {
      keyFn: getProp("datasetType"),
    });
    const uploadedDatasets = datasetsByType.get("upload") ?? [];
    const entityDatasets = datasetsByType.get("entities_queryable") ?? [];

    return [
      [
        ...uploadedDatasets.map((dataset) => {
          return makeDatasetLink(dataset, { style: borderStyle });
        }),
        {
          to: APP_CONFIG.links.dataImport.to,
          label: "Add new dataset",
          style: borderStyle,
          linkKey: "create-new",
        },
      ],

      entityConfigs === undefined ?
        []
      : entityDatasets.map((dataset) => {
          // make sure the dataset is the queryable entity type
          if (dataset.datasetType === "entities_queryable") {
            const entityConfigId = dataset.id.split("__")[1];
            if (entityConfigId) {
              const entityConfig = entityConfigs.find((config) => {
                return config.id === entityConfigId;
              });
              return entityConfig ?
                  makeDatasetLink(dataset, {
                    style: borderStyle,
                    label: entityConfig.name,
                  })
                : undefined;
            }
          }
          return undefined;
        }),
    ];
  }, [datasets, borderStyle, entityConfigs]);

  return (
    <Box bg="neutral.0" pt="lg" {...boxProps}>
      {isLoading ?
        <Loader />
      : null}
      <Title pl="sm" order={3}>
        Uploaded Datasets
      </Title>
      <NavLinkList
        pt="md"
        links={uploadedDatasetLinks}
        pr="md"
        inactiveHoverColor="neutral.1"
      />

      {entityDatasetLinks.length > 0 ?
        <>
          <Title pl="sm" order={3}>
            Profiles
          </Title>
          {isLoadingEntityConfigs ?
            <Loader />
          : <NavLinkList
              pt="md"
              links={entityDatasetLinks}
              pr="md"
              inactiveHoverColor="neutral.1"
            />
          }
        </>
      : null}
    </Box>
  );
}
