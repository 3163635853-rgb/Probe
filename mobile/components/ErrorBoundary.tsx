import { Component, type ReactNode } from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { AlertCircle, RotateCcw } from "lucide-react-native";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: string;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: "" };

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error: error.message };
  }

  render() {
    if (this.state.hasError) {
      return (
        <View className="flex-1 items-center justify-center bg-background px-8">
          <View className="h-16 w-16 items-center justify-center rounded-full bg-destructive/10 mb-4">
            <AlertCircle size={28} color="#dc2626" />
          </View>
          <Text className="text-lg font-semibold text-foreground mb-2">
            出错了
          </Text>
          <Text className="text-sm text-muted-foreground text-center mb-6 leading-5">
            {this.state.error || "发生未知错误，请重试"}
          </Text>
          <TouchableOpacity
            className="flex-row items-center gap-2 h-11 px-6 rounded-xl bg-primary"
            onPress={() => this.setState({ hasError: false, error: "" })}
            activeOpacity={0.85}
          >
            <RotateCcw size={14} color="#fff" />
            <Text className="text-sm font-semibold text-white">重试</Text>
          </TouchableOpacity>
        </View>
      );
    }
    return this.props.children;
  }
}
