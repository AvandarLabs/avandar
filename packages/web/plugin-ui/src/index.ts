/**
 * The components plugin UI may render. In-process plugins get these Mantine
 * components directly. When plugins move into the sandbox, the same names
 * become remote components, so plugin code does not change.
 */
export {
  Alert,
  Badge,
  Button,
  Divider,
  Group,
  Loader,
  NumberInput,
  Select,
  SimpleGrid,
  Stack,
  Table,
  Text,
  TextInput,
  Title,
} from "@mantine/core";
