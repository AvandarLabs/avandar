import {
  Box,
  BoxProps,
  Loader,
  NavLinkProps,
  Title,
  useMantineTheme,
} from "@mantine/core";
import { useMemo } from "react";
import { AppLinks } from "@/config/AppLinks";
import { useCurrentWorkspaceSlug } from "@/lib/hooks/workspaces/useCurrentWorkspaceSlug";
import { NavLinkList } from "@/lib/ui/links/NavLinkList";
import { isNotNullOrUndefined } from "@/lib/utils/guards";
import { makeBucketMapFromList } from "@/lib/utils/maps/builders";
import { getProp, propEquals } from "@/lib/utils/objects/higherOrderFuncs";
import { EntityConfigClient } from "@/models/EntityConfig/EntityConfigClient";
import { LocalDataset } from "@/models/LocalDataset/types";

type Props = {
  datasets: LocalDataset[];
  isLoading: boolean;
} & BoxProps;

function makeDatasetLink(options: {
  workspaceSlug: string;
  dataset: LocalDataset;
  style?: NavLinkProps["style"];
  label?: string;
}): NavLinkProps & { linkKey: string } {
  const { workspaceSlug, dataset, style, label } = options;
  const link = {
    ...AppLinks.dataManagerDatasetView({
      workspaceSlug,
      datasetId: dataset.id,
      datasetName: dataset.name,
    }),
    style,
    linkKey: dataset.id,
  };
  return label ? { ...link, label } : link;
}

export function DatasetNavbar({
  datasets,
  isLoading,
  ...boxProps
}: Props): JSX.Element {
  const workspaceSlug = useCurrentWorkspaceSlug();
  const theme = useMantineTheme();
  const borderStyle = useMemo(() => {
    return {
      borderTopRightRadius: theme.radius.md,
      borderBottomRightRadius: theme.radius.md,
    };
  }, [theme.radius]);

  const hasEntityDatasets = datasets.some(
    propEquals("datasetType", "entities_queryable"),
  );

  const [entityConfigs, isLoadingEntityConfigs] = EntityConfigClient.useGetAll({
    useQueryOptions: {
      enabled: hasEntityDatasets,
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
          return makeDatasetLink({
            workspaceSlug,
            dataset,
            style: borderStyle,
          });
        }),
        {
          to: AppLinks.dataImport(workspaceSlug).to,
          label: "Add new dataset",
          style: borderStyle,
          linkKey: "create-new",
        },
      ],

      entityConfigs === undefined || entityConfigs.length === 0 ?
        []
      : entityDatasets
          .map((dataset) => {
            // make sure the dataset is the queryable entity type
            if (dataset.datasetType === "entities_queryable") {
              const entityConfigId = dataset.id.split("__")[1];
              if (entityConfigId) {
                const entityConfig = entityConfigs.find((config) => {
                  return config.id === entityConfigId;
                });
                return entityConfig ?
                    makeDatasetLink({
                      workspaceSlug,
                      dataset,
                      style: borderStyle,
                      label: entityConfig.name,
                    })
                  : undefined;
              }
            }
            return undefined;
          })
          .filter(isNotNullOrUndefined),
    ];
  }, [datasets, borderStyle, entityConfigs, workspaceSlug]);

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
